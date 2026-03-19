import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FunctionsOutlinedIcon from '@mui/icons-material/FunctionsOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type {
  ModelPricing,
  CostByAgentItem,
} from '../services/modelPricingApi';
import { modelPricingApi } from '../services/modelPricingApi';
import { monoFontFamily } from '../theme';

const PAGE_SIZE = 20;

// ── Provider display config ───────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#74aa9c',
  anthropic: '#d4a876',
  google: '#4285f4',
  mistral: '#ff7000',
  cohere: '#39594d',
  meta: '#0668e1',
  amazon: '#ff9900',
  groq: '#f55036',
};

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? '#8B92E8';
}

function formatCostPerMillion(costPerToken: number | null): string {
  if (costPerToken === null) return '—';
  const perMillion = costPerToken * 1_000_000;
  if (perMillion === 0) return '$0.00';
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  return `$${perMillion.toFixed(2)}`;
}

function formatTokenCount(count: number | null): string {
  if (count === null) return '—';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

function formatUpdatedAt(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Provider filter chip ──────────────────────────────────────────────────────

function ProviderChip({
  provider,
  selected,
  onClick,
}: {
  provider: string;
  selected: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const color = providerColor(provider);

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.25,
        py: 0.5,
        borderRadius: '6px',
        border: `1px solid ${selected ? color : colors.border.default}`,
        backgroundColor: selected ? `${color}1A` : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        transition: 'all 0.1s ease',
        '&:hover': {
          borderColor: color,
          backgroundColor: `${color}12`,
        },
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: selected ? 600 : 400,
          color: selected ? color : colors.fg.muted,
          lineHeight: 1,
          textTransform: 'capitalize',
        }}
      >
        {provider}
      </Typography>
    </Box>
  );
}

// ── Feature badge ─────────────────────────────────────────────────────────────

function FeatureBadge({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  const theme = useTheme();
  const colors = theme.colors;

  if (!active) return <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>—</Typography>;

  return (
    <Chip
      icon={<Box sx={{ display: 'flex', alignItems: 'center', '& svg': { fontSize: '0.7rem !important' } }}>{icon}</Box>}
      label={label}
      size="small"
      sx={{
        height: 20,
        fontSize: '0.6875rem',
        backgroundColor: colors.success.subtle,
        color: colors.success.fg,
        border: `1px solid ${colors.success.muted}`,
        '& .MuiChip-label': { px: 0.75 },
        '& .MuiChip-icon': { color: colors.success.fg, ml: 0.5 },
      }}
    />
  );
}

// ── Provider tab ──────────────────────────────────────────────────────────────

function ProviderTab() {
  const theme = useTheme();
  const colors = theme.colors;

  const [items, setItems] = useState<ModelPricing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [page, setPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Active model names for "In Use" badge
  const [activeModelNames, setActiveModelNames] = useState<Set<string>>(new Set());

  // Derive provider list from loaded data (all providers, cached)
  const [allProviders, setAllProviders] = useState<string[]>([]);

  const load = useCallback(
    (currentPage: number, currentSearch: string, currentProvider: string) => {
      setLoading(true);
      setError(null);
      modelPricingApi
        .list({
          provider: currentProvider || undefined,
          search: currentSearch || undefined,
          limit: PAGE_SIZE,
          offset: (currentPage - 1) * PAGE_SIZE,
        })
        .then((data) => {
          setItems(data.items);
          setTotal(data.total);
          // Update last updated from the most recent item
          const dates = data.items
            .map((m) => m.updated_at)
            .filter((d): d is string => d !== null);
          if (dates.length > 0) {
            const latest = dates.reduce((a, b) => (a > b ? a : b));
            setLastUpdated(latest);
          }
        })
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [],
  );

  // Initial load without filters to gather all providers
  useEffect(() => {
    modelPricingApi
      .list({ limit: 500 })
      .then((data) => {
        const providers = [...new Set(data.items.map((m) => m.provider.toLowerCase()))].sort();
        setAllProviders(providers);
      })
      .catch(() => {});
  }, []);

  // Fetch active model names for "In Use" badge
  useEffect(() => {
    modelPricingApi
      .active()
      .then((activeModels) => {
        setActiveModelNames(new Set(activeModels.map((m) => m.model_name)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(page, search, selectedProvider);
  }, [load, page, search, selectedProvider]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, selectedProvider]);

  const handleSync = useCallback(() => {
    setSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    modelPricingApi
      .sync()
      .then((result) => {
        setSyncSuccess(`Synced ${result.synced} models successfully.`);
        // Reload after sync
        load(1, search, selectedProvider);
        setPage(1);
      })
      .catch((err: Error) => setSyncError(err.message))
      .finally(() => setSyncing(false));
  }, [load, search, selectedProvider]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tableColumns = [
    { label: 'Model Name', width: '30%' },
    { label: 'Provider', width: '10%' },
    { label: 'Input Cost / 1M', width: '13%' },
    { label: 'Output Cost / 1M', width: '13%' },
    { label: 'Max Input', width: '10%' },
    { label: 'Max Output', width: '10%' },
    { label: 'Capabilities', width: '14%' },
  ];

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* All chip */}
          <Box
            onClick={() => setSelectedProvider('')}
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: '6px',
              border: `1px solid ${selectedProvider === '' ? colors.accent.emphasis : colors.border.default}`,
              backgroundColor: selectedProvider === '' ? colors.accent.subtle : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.1s ease',
              '&:hover': {
                borderColor: colors.accent.emphasis,
                backgroundColor: colors.accent.subtle,
              },
            }}
          >
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: selectedProvider === '' ? 600 : 400,
                color: selectedProvider === '' ? colors.accent.fg : colors.fg.muted,
                lineHeight: 1,
              }}
            >
              All
            </Typography>
          </Box>
          {allProviders.map((p) => (
            <ProviderChip
              key={p}
              provider={p}
              selected={selectedProvider === p}
              onClick={() => setSelectedProvider(selectedProvider === p ? '' : p)}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lastUpdated && (
            <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle }}>
              Updated {formatUpdatedAt(lastUpdated)}
            </Typography>
          )}
          <TextField
            size="small"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 14, color: colors.fg.subtle }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 200 }}
          />
          <Tooltip title="Sync latest pricing data from provider sources">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  syncing ? (
                    <CircularProgress size={12} sx={{ color: 'inherit' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: '0.875rem !important' }} />
                  )
                }
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Feedback banners */}
      {syncError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSyncError(null)}>
          {syncError}
        </Alert>
      )}
      {syncSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSyncSuccess(null)}>
          {syncSuccess}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <Box
          sx={{
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            border: `1px dashed ${colors.border.default}`,
            borderRadius: '8px',
          }}
        >
          <AttachMoneyOutlinedIcon sx={{ fontSize: 48, color: colors.fg.subtle }} />
          <Typography variant="body1" sx={{ color: colors.fg.muted }}>
            No pricing data available.
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.subtle }}>
            Click Sync to fetch the latest data.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SyncIcon sx={{ fontSize: '0.875rem !important' }} />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ mt: 0.5 }}
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </Box>
      )}

      {/* Table */}
      {!loading && !error && items.length > 0 && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {tableColumns.map((col) => (
                    <TableCell
                      key={col.label}
                      sx={{
                        width: col.width,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: colors.fg.subtle,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        py: 1,
                        backgroundColor: colors.canvas.subtle,
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((model) => {
                  const pColor = providerColor(model.provider);
                  const isActive = activeModelNames.has(model.model_name);
                  return (
                    <TableRow
                      key={model.id}
                      sx={{
                        ...(isActive
                          ? {
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.success.fg}`,
                                pl: '13px',
                              },
                            }
                          : {
                              '& .MuiTypography-root': {
                                color: colors.fg.muted,
                              },
                            }),
                      }}
                    >
                      {/* Model name */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {isActive && (
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: colors.success.fg,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <Typography
                            sx={{
                              fontSize: '0.8125rem',
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? colors.fg.default : undefined,
                              fontFamily: monoFontFamily,
                            }}
                          >
                            {model.model_name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Provider */}
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 0.875,
                            py: 0.25,
                            borderRadius: '4px',
                            border: `1px solid ${pColor}40`,
                            backgroundColor: `${pColor}12`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              backgroundColor: pColor,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: pColor,
                              textTransform: 'capitalize',
                            }}
                          >
                            {model.provider}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Input cost */}
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color:
                              model.input_cost_per_token !== null
                                ? colors.fg.default
                                : colors.fg.subtle,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCostPerMillion(model.input_cost_per_token)}
                        </Typography>
                      </TableCell>

                      {/* Output cost */}
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color:
                              model.output_cost_per_token !== null
                                ? colors.fg.default
                                : colors.fg.subtle,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatCostPerMillion(model.output_cost_per_token)}
                        </Typography>
                      </TableCell>

                      {/* Max input tokens */}
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatTokenCount(model.max_input_tokens)}
                        </Typography>
                      </TableCell>

                      {/* Max output tokens */}
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatTokenCount(model.max_output_tokens)}
                        </Typography>
                      </TableCell>

                      {/* Capabilities */}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <FeatureBadge
                            icon={<VisibilityOutlinedIcon />}
                            label="Vision"
                            active={model.supports_vision}
                          />
                          <FeatureBadge
                            icon={<FunctionsOutlinedIcon />}
                            label="Tools"
                            active={model.supports_function_calling}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination + count */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
              px: 0.5,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>
              {total} model{total !== 1 ? 's' : ''}
              {selectedProvider && ` · ${selectedProvider}`}
              {search && ` · "${search}"`}
            </Typography>
            {totalPages > 1 && (
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                size="small"
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

// ── Usage tab helpers ─────────────────────────────────────────────────────────

type UsagePeriod = '24h' | '7d' | '30d' | 'all';

const PERIOD_HOURS: Record<UsagePeriod, number | undefined> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
  'all': undefined,
};

function formatTotalCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatModelCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.0000';
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ── Chart series colors ────────────────────────────────────────────────────────

const SERIES_COLORS = ['#5E6AD2', '#4ADE80', '#60A5FA', '#C084FC', '#FDE68A', '#666666'];

function seriesColor(index: number): string {
  return SERIES_COLORS[Math.min(index, SERIES_COLORS.length - 1)];
}

// ── Period pill row ────────────────────────────────────────────────────────────

const PERIODS: UsagePeriod[] = ['24h', '7d', '30d', 'all'];
const PERIOD_LABELS: Record<UsagePeriod, string> = { '24h': '24h', '7d': '7d', '30d': '30d', 'all': 'All' };

function PeriodSelector({
  period,
  onSelect,
}: {
  period: UsagePeriod;
  onSelect: (p: UsagePeriod) => void;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {PERIODS.map((p) => (
        <Box
          key={p}
          onClick={() => onSelect(p)}
          sx={{
            px: 1.25,
            py: 0.5,
            borderRadius: '6px',
            border: `1px solid ${period === p ? colors.accent.emphasis : colors.border.default}`,
            backgroundColor: period === p ? colors.accent.subtle : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            '&:hover': {
              borderColor: colors.accent.emphasis,
              backgroundColor: colors.accent.subtle,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: period === p ? 600 : 400,
              color: period === p ? colors.accent.fg : colors.fg.muted,
              lineHeight: 1,
            }}
          >
            {PERIOD_LABELS[p]}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ── Section label style helper ────────────────────────────────────────────────

const sectionLabelSx = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  fontFamily: monoFontFamily,
};

// ── SpendPulse — Section 1 ────────────────────────────────────────────────────

interface SparkPoint {
  bucket: string;
  cost: number;
}

function SpendPulse({
  totalCost,
  avgPerRun,
  runs,
  loading,
  sparkData,
}: {
  totalCost: number | null;
  avgPerRun: number | null;
  runs: number;
  loading: boolean;
  sparkData: SparkPoint[];
}) {
  const theme = useTheme();
  const colors = theme.colors;

  const cards = [
    {
      label: 'Total Cost',
      value: formatTotalCost(totalCost),
      accent: true,
    },
    {
      label: 'Per Run',
      value: avgPerRun !== null ? `$${avgPerRun.toFixed(4)}` : '—',
      accent: false,
    },
    {
      label: 'Runs',
      value: loading ? '—' : formatNumber(runs),
      accent: false,
    },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <Box
          key={card.label}
          sx={{
            minWidth: 140,
            px: 2.5,
            py: 2,
            borderRadius: '8px',
            border: `1px solid ${card.accent ? colors.accent.muted : colors.border.muted}`,
            background: colors.canvas.subtle,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          <Typography sx={{ ...sectionLabelSx, color: colors.fg.subtle }}>
            {card.label}
          </Typography>
          {loading ? (
            <Box sx={{ height: 36, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={14} sx={{ color: colors.fg.subtle }} />
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: card.accent ? colors.accent.fg : colors.fg.default,
                fontFamily: monoFontFamily,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1.2,
              }}
            >
              {card.value}
            </Typography>
          )}
        </Box>
      ))}

      {/* Sparkline */}
      <Box sx={{ flex: 1, minWidth: 120 }}>
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={sparkData} margin={{ top: 8, right: 0, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent.emphasis} stopOpacity={0.2} />
                <stop offset="100%" stopColor={colors.accent.emphasis} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="cost"
              stroke={colors.accent.emphasis}
              strokeWidth={1.5}
              fill="url(#spark-grad)"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

// ── CostTrendChart — Full-width trend chart ───────────────────────────────────

function CostTrendChart({ period }: { period: UsagePeriod }) {
  const theme = useTheme();
  const colors = theme.colors;

  const [groupBy, setGroupBy] = useState<'agent' | 'model'>('agent');
  const [buckets, setBuckets] = useState<Record<string, number | string>[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    setChartLoading(true);
    setChartError(null);
    modelPricingApi
      .costTimeseries(PERIOD_HOURS[period], groupBy)
      .then((res) => {
        const byBucket = new Map<string, Record<string, number>>();
        const groupSet = new Set<string>();
        for (const row of res.buckets) {
          groupSet.add(row.group);
          if (!byBucket.has(row.bucket)) {
            byBucket.set(row.bucket, { bucket: row.bucket } as unknown as Record<string, number>);
          }
          const entry = byBucket.get(row.bucket)!;
          entry[row.group] = (entry[row.group] ?? 0) + row.cost;
        }
        const sortedBuckets = [...byBucket.values()].sort((a, b) =>
          String(a.bucket) < String(b.bucket) ? -1 : 1,
        );
        setBuckets(sortedBuckets);
        setGroups([...groupSet]);
      })
      .catch((err: Error) => setChartError(err.message))
      .finally(() => setChartLoading(false));
  }, [period, groupBy]);

  const formatBucketLabel = (bucket: string) => {
    const d = new Date(bucket);
    if (isNaN(d.getTime())) return bucket;
    if (period === '24h') return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCostTick = (value: number) => {
    if (value === 0) return '$0';
    if (value < 0.01) return `$${value.toFixed(4)}`;
    if (value < 1) return `$${value.toFixed(3)}`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <Box
      sx={{
        borderRadius: '8px',
        border: `1px solid ${colors.border.muted}`,
        background: colors.canvas.subtle,
        p: 2.5,
        mb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography sx={{ ...sectionLabelSx, color: colors.fg.subtle }}>
          Cost Trend
        </Typography>

        {/* By Agent / By Model toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(['agent', 'model'] as const).map((g) => (
            <Box
              key={g}
              onClick={() => setGroupBy(g)}
              sx={{
                px: 1.25,
                py: 0.375,
                borderRadius: '6px',
                border: `1px solid ${groupBy === g ? colors.accent.emphasis : colors.border.default}`,
                backgroundColor: groupBy === g ? colors.accent.subtle : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                '&:hover': { borderColor: colors.accent.emphasis },
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: groupBy === g ? 600 : 400,
                  color: groupBy === g ? colors.accent.fg : colors.fg.muted,
                  textTransform: 'capitalize',
                  lineHeight: 1,
                }}
              >
                By {g}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Chart body */}
      {chartLoading && (
        <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {!chartLoading && chartError && (
        <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            Failed to load chart data
          </Typography>
        </Box>
      )}
      {!chartLoading && !chartError && buckets.length === 0 && (
        <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            No data for this period
          </Typography>
        </Box>
      )}
      {!chartLoading && !chartError && buckets.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {groups.map((g, i) => (
                <linearGradient key={g} id={`trend-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={seriesColor(i)} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={seriesColor(i)} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border.muted} vertical={false} />
            <XAxis
              dataKey="bucket"
              tickFormatter={formatBucketLabel}
              tick={{ fontSize: 11, fill: colors.fg.subtle }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              tickFormatter={formatCostTick}
              tick={{ fontSize: 11, fill: colors.fg.subtle }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: colors.canvas.overlay,
                border: `1px solid ${colors.border.muted}`,
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: colors.fg.default,
              }}
              labelStyle={{ color: colors.fg.muted, marginBottom: 4 }}
              labelFormatter={(label) => formatBucketLabel(String(label))}
              formatter={(value, name) => [`$${Number(value).toFixed(4)}`, String(name)]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: '0.75rem', color: colors.fg.muted, paddingTop: 12 }}
            />
            {groups.map((g, i) => (
              <Area
                key={g}
                type="monotone"
                dataKey={g}
                name={g}
                stroke={seriesColor(i)}
                strokeWidth={1.5}
                fill={`url(#trend-grad-${i})`}
                stackId="1"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}

// ── AgentCostList — Simple agent cost ranking list ────────────────────────────

const TOP_AGENT_COUNT = 10;

function AgentCostList({
  items,
  totalCost,
  loading,
}: {
  items: CostByAgentItem[];
  totalCost: number | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const sorted = [...items].sort((a, b) => (b.total_cost ?? -1) - (a.total_cost ?? -1));
  const displayed = showAll ? sorted : sorted.slice(0, TOP_AGENT_COUNT);
  const hidden = sorted.length - TOP_AGENT_COUNT;

  return (
    <Box
      sx={{
        borderRadius: '8px',
        border: `1px solid ${colors.border.muted}`,
        background: colors.canvas.subtle,
        mb: 4,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${colors.border.muted}`,
        }}
      >
        <Typography sx={{ ...sectionLabelSx, color: colors.fg.subtle }}>
          Agents
        </Typography>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            No agent data for this period
          </Typography>
        </Box>
      )}

      {/* Rows */}
      {!loading && displayed.map((item) => {
        const pct =
          totalCost && item.total_cost !== null
            ? (item.total_cost / totalCost) * 100
            : null;
        const barFill = pct !== null ? Math.max(0, Math.min(100, pct)) : 0;

        return (
          <Box
            key={item.agent_id}
            onClick={() => navigate(`/agents/${item.agent_id}/cost`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              cursor: 'pointer',
              borderBottom: `1px solid ${colors.border.muted}`,
              transition: 'background 0.1s ease',
              '&:hover': { backgroundColor: colors.canvas.elevated },
              '&:last-of-type': { borderBottom: 'none' },
            }}
          >
            {/* Agent name */}
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: colors.fg.default,
                fontFamily: monoFontFamily,
                minWidth: 0,
                flex: '0 0 160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.agent_name}
            </Typography>

            {/* Cost */}
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: colors.accent.fg,
                fontFamily: monoFontFamily,
                fontVariantNumeric: 'tabular-nums',
                flex: '0 0 80px',
                textAlign: 'right',
              }}
            >
              {formatModelCost(item.total_cost)}
            </Typography>

            {/* Percentage text */}
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: colors.fg.subtle,
                fontVariantNumeric: 'tabular-nums',
                flex: '0 0 36px',
                textAlign: 'right',
              }}
            >
              {pct !== null ? `${pct.toFixed(1)}%` : '—'}
            </Typography>

            {/* Bar */}
            <Box
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border.muted,
                overflow: 'hidden',
                minWidth: 80,
                maxWidth: 120,
              }}
            >
              <Box
                sx={{
                  width: `${barFill}%`,
                  height: '100%',
                  borderRadius: 2,
                  backgroundColor: colors.accent.emphasis,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>

            {/* Chevron */}
            <ChevronRightIcon
              sx={{
                fontSize: 14,
                color: colors.fg.subtle,
                flexShrink: 0,
                ml: 'auto',
              }}
            />
          </Box>
        );
      })}

      {/* Show more / less */}
      {!loading && !showAll && hidden > 0 && (
        <Box sx={{ px: 2.5, py: 1.25 }}>
          <Typography
            onClick={() => setShowAll(true)}
            sx={{
              fontSize: '0.75rem',
              color: colors.accent.fg,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Show {hidden} more
          </Typography>
        </Box>
      )}
      {!loading && showAll && sorted.length > TOP_AGENT_COUNT && (
        <Box sx={{ px: 2.5, py: 1.25 }}>
          <Typography
            onClick={() => setShowAll(false)}
            sx={{
              fontSize: '0.75rem',
              color: colors.accent.fg,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Show less
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── ModelCatalog — Section 3 ──────────────────────────────────────────────────

function ModelCatalog({ totalModels }: { totalModels: number }) {
  const theme = useTheme();
  const colors = theme.colors;
  const [open, setOpen] = useState(false);

  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(() => {
    setSyncing(true);
    modelPricingApi
      .sync()
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, []);

  return (
    <Box
      sx={{
        borderRadius: '8px',
        border: `1px solid ${colors.border.muted}`,
        background: colors.canvas.subtle,
        mb: 4,
        overflow: 'hidden',
      }}
    >
      {/* Collapsed header */}
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.5,
          py: 1.75,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { backgroundColor: colors.canvas.elevated },
          transition: 'background 0.1s ease',
          borderBottom: open ? `1px solid ${colors.border.muted}` : 'none',
        }}
      >
        <ExpandMoreIcon
          sx={{
            fontSize: 16,
            color: colors.fg.subtle,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        />
        <Typography sx={{ ...sectionLabelSx, color: colors.fg.subtle, flex: 1 }}>
          Model Catalog{totalModels > 0 ? ` · ${totalModels} models` : ''}
        </Typography>
        <Tooltip title="Sync latest pricing data">
          <span>
            <Button
              variant="outlined"
              size="small"
              startIcon={
                syncing ? (
                  <CircularProgress size={10} sx={{ color: 'inherit' }} />
                ) : (
                  <SyncIcon sx={{ fontSize: '0.75rem !important' }} />
                )
              }
              onClick={(e) => { e.stopPropagation(); handleSync(); }}
              disabled={syncing}
              sx={{ fontSize: '0.6875rem', py: 0.25 }}
            >
              {syncing ? 'Syncing…' : 'Sync'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {open && (
        <Box sx={{ p: 2.5 }}>
          <ProviderTab />
        </Box>
      )}
    </Box>
  );
}

// ── Main CostPage ─────────────────────────────────────────────────────────────

export default function CostPage() {
  const theme = useTheme();
  const colors = theme.colors;

  const [period, setPeriod] = useState<UsagePeriod>('24h');

  // Agent-level data
  const [agentData, setAgentData] = useState<{
    items: CostByAgentItem[];
    totalCost: number | null;
    totalRuns: number;
  } | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Sparkline data from timeseries
  const [sparkData, setSparkData] = useState<{ bucket: string; cost: number }[]>([]);

  // Total models count for ModelCatalog header
  const [totalModels, setTotalModels] = useState(0);

  useEffect(() => {
    setAgentLoading(true);
    setAgentError(null);
    modelPricingApi
      .costByAgent(PERIOD_HOURS[period])
      .then((res) => {
        setAgentData({ items: res.items, totalCost: res.total_cost, totalRuns: res.total_runs });
      })
      .catch((err: Error) => setAgentError(err.message))
      .finally(() => setAgentLoading(false));
  }, [period]);

  // Sparkline: aggregate timeseries buckets
  useEffect(() => {
    modelPricingApi
      .costTimeseries(PERIOD_HOURS[period], 'agent')
      .then((res) => {
        const byBucket = new Map<string, number>();
        for (const row of res.buckets) {
          byBucket.set(row.bucket, (byBucket.get(row.bucket) ?? 0) + row.cost);
        }
        const sorted = [...byBucket.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([bucket, cost]) => ({ bucket, cost }));
        setSparkData(sorted);
      })
      .catch(() => {});
  }, [period]);

  // Fetch total model count for catalog header
  useEffect(() => {
    modelPricingApi
      .list({ limit: 1 })
      .then((res) => setTotalModels(res.total))
      .catch(() => {});
  }, []);

  // KPI derivations
  const billedRuns = agentData
    ? agentData.items.filter((i) => i.total_cost !== null).reduce((acc, i) => acc + i.run_count, 0)
    : 0;
  const avgPerRun =
    agentData && agentData.totalCost !== null && billedRuns > 0
      ? agentData.totalCost / billedRuns
      : null;

  return (
    <Box>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AttachMoneyOutlinedIcon sx={{ fontSize: 20, color: colors.fg.subtle }} />
          <Typography variant="h2">Cost</Typography>
        </Box>
        <PeriodSelector period={period} onSelect={setPeriod} />
      </Box>

      {agentError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {agentError}
        </Alert>
      )}

      {/* Section 1: SpendPulse */}
      <SpendPulse
        totalCost={agentData?.totalCost ?? null}
        avgPerRun={avgPerRun}
        runs={agentData?.totalRuns ?? 0}
        loading={agentLoading}
        sparkData={sparkData}
      />

      {/* Section 2: Cost Trend Chart */}
      <CostTrendChart period={period} />

      {/* Section 3: Agent Cost List */}
      <AgentCostList
        items={agentData?.items ?? []}
        totalCost={agentData?.totalCost ?? null}
        loading={agentLoading}
      />

      {/* Section 4: Model Catalog */}
      <ModelCatalog totalModels={totalModels} />
    </Box>
  );
}
