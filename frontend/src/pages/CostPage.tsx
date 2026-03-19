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
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FunctionsOutlinedIcon from '@mui/icons-material/FunctionsOutlined';
import type { ModelPricing } from '../services/modelPricingApi';
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
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <Box
          sx={{
            py: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            border: `1px dashed ${colors.border.default}`,
            borderRadius: '8px',
          }}
        >
          <AttachMoneyOutlinedIcon sx={{ fontSize: 40, color: colors.fg.subtle }} />
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
          <Tab label="Providers" />
        </Tabs>
      </Box>

      {/* Tab content */}
      {tab === 0 && <ProviderTab />}
    </Box>
  );
}
