import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Pagination,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
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
import type { ModelPricing, CostSummary, ActiveModel, CostByAgentItem } from '../services/modelPricingApi';
import { modelPricingApi } from '../services/modelPricingApi';

const PAGE_SIZE = 20;

// Provider display config — color accent per provider
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
                              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
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

// ── KPI Tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string;
  accent?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        maxWidth: 220,
        px: 2,
        py: 1.75,
        borderRadius: '8px',
        border: `1px solid ${accent ? colors.accent.muted : colors.border.muted}`,
        background: accent
          ? `linear-gradient(135deg, ${colors.accent.subtle} 0%, ${colors.canvas.subtle} 100%)`
          : colors.canvas.subtle,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: colors.fg.subtle,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Box sx={{ height: 28, display: 'flex', alignItems: 'center' }}>
          <CircularProgress size={16} sx={{ color: colors.fg.subtle }} />
        </Box>
      ) : (
        <Typography
          sx={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: accent ? colors.accent.fg : colors.fg.default,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
}

// ── Cost Trend Chart ───────────────────────────────────────────────────────────

type ChartGroupBy = 'agent' | 'model';

function CostTrendChart({ period }: { period: UsagePeriod }) {
  const theme = useTheme();
  const colors = theme.colors;

  const [groupBy, setGroupBy] = useState<ChartGroupBy>('agent');
  const [buckets, setBuckets] = useState<Record<string, number | string>[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    modelPricingApi
      .costTimeseries(PERIOD_HOURS[period], groupBy)
      .then((res) => {
        // Transform flat rows into { bucket, group1: cost, group2: cost, ... }
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
        const sortedGroups = [...groupSet];

        setBuckets(sortedBuckets);
        setGroups(sortedGroups);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [period, groupBy]);

  const formatBucketLabel = (bucket: string) => {
    const d = new Date(bucket);
    if (isNaN(d.getTime())) return bucket;
    if (period === '24h') {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    }
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
      {/* Chart header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: colors.fg.default,
          }}
        >
          Cost Trend
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {(['agent', 'model'] as ChartGroupBy[]).map((g) => (
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
                '&:hover': {
                  borderColor: colors.accent.emphasis,
                },
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

      {loading && (
        <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && error && (
        <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            Failed to load chart data
          </Typography>
        </Box>
      )}

      {!loading && !error && buckets.length === 0 && (
        <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            No data for this period
          </Typography>
        </Box>
      )}

      {!loading && !error && buckets.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {groups.map((g, i) => (
                <linearGradient key={g} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={seriesColor(i)} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={seriesColor(i)} stopOpacity={0.03} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border.muted}
              vertical={false}
            />
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
              formatter={(value, name) => [
                `$${Number(value).toFixed(4)}`,
                String(name),
              ]}
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
                fill={`url(#grad-${i})`}
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

// ── By-Agent breakdown table ───────────────────────────────────────────────────

function AgentBreakdownTable({
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

  const displayed = showAll ? items : items.slice(0, 10);
  const hasMore = items.length > 10;

  const cols = [
    { label: 'Agent', width: '30%' },
    { label: 'Runs', width: '10%' },
    { label: 'Tokens', width: '14%' },
    { label: 'Cost', width: '14%' },
    { label: '% of Total', width: '18%' },
    { label: 'Avg / Run', width: '14%' },
  ];

  return (
    <Box
      sx={{
        flex: '3 1 400px',
        minWidth: 0,
        borderRadius: '8px',
        border: `1px solid ${colors.border.muted}`,
        background: colors.canvas.subtle,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.border.muted}` }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.default }}>
          By Agent
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && items.length === 0 && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            No agent data
          </Typography>
        </Box>
      )}

      {!loading && items.length > 0 && (
        <>
          <TableContainer sx={{ border: 'none', borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {cols.map((col) => (
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
                        borderBottom: `1px solid ${colors.border.muted}`,
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((item) => {
                  const pct =
                    totalCost && item.total_cost !== null
                      ? (item.total_cost / totalCost) * 100
                      : null;
                  const hasCost = item.total_cost !== null;

                  return (
                    <TableRow
                      key={item.agent_id}
                      sx={{
                        cursor: 'pointer',
                        '&:hover td': { backgroundColor: `${colors.accent.subtle}` },
                      }}
                      onClick={() => navigate(`/agents/${item.agent_id}/stats`)}
                    >
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            color: hasCost ? colors.fg.default : colors.fg.muted,
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            '&:hover': { color: colors.accent.fg },
                          }}
                        >
                          {item.agent_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatNumber(item.run_count)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatTokenCount(item.total_tokens)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: hasCost ? 600 : 400,
                            color: hasCost ? colors.accent.fg : colors.fg.subtle,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatModelCost(item.total_cost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              flex: 1,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: colors.border.muted,
                              overflow: 'hidden',
                            }}
                          >
                            {pct !== null && (
                              <Box
                                sx={{
                                  width: `${Math.min(pct, 100)}%`,
                                  height: '100%',
                                  borderRadius: 2,
                                  backgroundColor: colors.accent.emphasis,
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              color: colors.fg.muted,
                              fontVariantNumeric: 'tabular-nums',
                              minWidth: 36,
                              textAlign: 'right',
                            }}
                          >
                            {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: hasCost ? colors.fg.default : colors.fg.subtle,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {item.avg_cost_per_run !== null
                            ? `$${item.avg_cost_per_run.toFixed(4)}`
                            : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && (
            <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${colors.border.muted}` }}>
              <Typography
                onClick={() => setShowAll((v) => !v)}
                sx={{
                  fontSize: '0.75rem',
                  color: colors.accent.fg,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {showAll ? 'Show less' : `Show all ${items.length} agents`}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ── By-Model breakdown table ───────────────────────────────────────────────────

function ModelBreakdownTable({
  models,
  totalCost,
  loading,
}: {
  models: ActiveModel[];
  totalCost: number | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const [showAll, setShowAll] = useState(false);

  const sortedModels = [...models].sort((a, b) => (b.total_cost ?? -1) - (a.total_cost ?? -1));
  const displayed = showAll ? sortedModels : sortedModels.slice(0, 10);
  const hasMore = sortedModels.length > 10;

  const cols = [
    { label: 'Model', width: '46%' },
    { label: 'Calls', width: '14%' },
    { label: 'Cost', width: '20%' },
    { label: '%', width: '20%' },
  ];

  return (
    <Box
      sx={{
        flex: '2 1 280px',
        minWidth: 0,
        borderRadius: '8px',
        border: `1px solid ${colors.border.muted}`,
        background: colors.canvas.subtle,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${colors.border.muted}` }}>
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.default }}>
          By Model
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && sortedModels.length === 0 && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
            No model data
          </Typography>
        </Box>
      )}

      {!loading && sortedModels.length > 0 && (
        <>
          <TableContainer sx={{ border: 'none', borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {cols.map((col) => (
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
                        borderBottom: `1px solid ${colors.border.muted}`,
                      }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayed.map((model) => {
                  const pColor = providerColor(model.provider ?? 'unknown');
                  const pct =
                    totalCost && model.total_cost !== null
                      ? (model.total_cost / totalCost) * 100
                      : null;
                  const hasCost = model.total_cost !== null;

                  return (
                    <TableRow key={model.model_name}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875 }}>
                          <Box
                            sx={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              backgroundColor: pColor,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: hasCost ? colors.fg.default : colors.fg.muted,
                              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {model.model_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatNumber(model.call_count)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            fontWeight: hasCost ? 600 : 400,
                            color: hasCost ? colors.accent.fg : colors.fg.subtle,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatModelCost(model.total_cost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: colors.fg.muted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {hasMore && (
            <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${colors.border.muted}` }}>
              <Typography
                onClick={() => setShowAll((v) => !v)}
                sx={{
                  fontSize: '0.75rem',
                  color: colors.accent.fg,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                {showAll ? 'Show less' : `Show all ${sortedModels.length} models`}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ── Usage tab ─────────────────────────────────────────────────────────────────

function UsageTab() {
  const [period, setPeriod] = useState<UsagePeriod>('24h');

  // Section 1: KPI data (from costByAgent totals)
  const [agentData, setAgentData] = useState<{
    items: CostByAgentItem[];
    totalCost: number | null;
    totalRuns: number;
    totalTokens: number;
  } | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Section 3 right: summary (by_model)
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    setAgentLoading(true);
    setAgentError(null);
    modelPricingApi
      .costByAgent(PERIOD_HOURS[period])
      .then((res) => {
        setAgentData({
          items: res.items,
          totalCost: res.total_cost,
          totalRuns: res.total_runs,
          totalTokens: res.total_tokens,
        });
      })
      .catch((err: Error) => setAgentError(err.message))
      .finally(() => setAgentLoading(false));
  }, [period]);

  useEffect(() => {
    setSummaryLoading(true);
    modelPricingApi
      .costSummary(PERIOD_HOURS[period])
      .then(setSummary)
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [period]);

  // Compute KPI values
  const billedRuns = agentData
    ? agentData.items.filter((i) => i.total_cost !== null).reduce((acc, i) => acc + i.run_count, 0)
    : 0;

  const totalPromptTokens = agentData
    ? agentData.items.reduce((acc, i) => acc + i.total_prompt_tokens, 0)
    : 0;

  const totalCompletionTokens = agentData
    ? agentData.items.reduce((acc, i) => acc + i.total_completion_tokens, 0)
    : 0;

  const avgCostPerRun =
    agentData && agentData.totalCost !== null && billedRuns > 0
      ? agentData.totalCost / billedRuns
      : null;

  return (
    <Box>
      {/* Global period selector */}
      <Box sx={{ mb: 3 }}>
        <PeriodSelector period={period} onSelect={setPeriod} />
      </Box>

      {/* Error banner */}
      {agentError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {agentError}
        </Alert>
      )}

      {/* Section 1: KPI tiles */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
        <KpiTile
          label="Total Cost"
          value={formatTotalCost(agentData?.totalCost ?? null)}
          accent
          loading={agentLoading}
        />
        <KpiTile
          label="Avg Cost / Run"
          value={avgCostPerRun !== null ? `$${avgCostPerRun.toFixed(4)}` : '—'}
          loading={agentLoading}
        />
        <KpiTile
          label="Billed Runs"
          value={agentLoading ? '—' : formatNumber(billedRuns)}
          loading={agentLoading}
        />
        <KpiTile
          label="Input Tokens"
          value={agentLoading ? '—' : formatTokenCount(totalPromptTokens)}
          loading={agentLoading}
        />
        <KpiTile
          label="Output Tokens"
          value={agentLoading ? '—' : formatTokenCount(totalCompletionTokens)}
          loading={agentLoading}
        />
      </Box>

      {/* Section 2: Cost trend chart */}
      <CostTrendChart period={period} />

      {/* Section 3: Two-column breakdown */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <AgentBreakdownTable
          items={agentData?.items ?? []}
          totalCost={agentData?.totalCost ?? null}
          loading={agentLoading}
        />
        <ModelBreakdownTable
          models={summary?.by_model ?? []}
          totalCost={summary?.total_cost ?? null}
          loading={summaryLoading}
        />
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CostPage() {
  const theme = useTheme();
  const colors = theme.colors;
  const [tab, setTab] = useState(0);

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AttachMoneyOutlinedIcon sx={{ fontSize: 20, color: colors.fg.subtle }} />
        <Typography variant="h2">Cost</Typography>
      </Box>

      {/* Tab bar */}
      <Box sx={{ borderBottom: `1px solid ${colors.border.muted}`, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          sx={{ minHeight: 40 }}
        >
          <Tab label="Usage" />
          <Tab label="Providers" />
        </Tabs>
      </Box>

      {/* Tab content */}
      {tab === 0 && <UsageTab />}
      {tab === 1 && <ProviderTab />}
    </Box>
  );
}
