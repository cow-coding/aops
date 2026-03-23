import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
  CostByChainItem,
  CostByAgentItem,
  ActiveModel,
} from '../../services/modelPricingApi';
import { modelPricingApi } from '../../services/modelPricingApi';
import { monoFontFamily } from '../../theme';
import type { AgentDetailContext } from '../../types/agentDetail';
import EmptyState from '../../components/EmptyState';

// ── Period helpers ─────────────────────────────────────────────────────────────

type UsagePeriod = '24h' | '7d' | '30d' | 'all';

const PERIOD_HOURS: Record<UsagePeriod, number | undefined> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
  all: undefined,
};

const PERIODS: UsagePeriod[] = ['24h', '7d', '30d', 'all'];
const PERIOD_LABELS: Record<UsagePeriod, string> = {
  '24h': '24h',
  '7d': '7d',
  '30d': '30d',
  all: 'All',
};

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatTotalCost(cost: number | null): string {
  if (cost === null) return '—';
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ── Shared style constants ─────────────────────────────────────────────────────

const sectionLabelSx = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  fontFamily: monoFontFamily,
};

const SERIES_COLORS = ['#5E6AD2', '#4ADE80', '#60A5FA', '#C084FC', '#FDE68A', '#666666'];

function seriesColor(index: number): string {
  return SERIES_COLORS[Math.min(index, SERIES_COLORS.length - 1)];
}

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

// ── PeriodSelector ─────────────────────────────────────────────────────────────

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

// ── Section 1: KPI Summary cards ───────────────────────────────────────────────

interface KpiData {
  totalCost: number | null;
  avgPerRun: number | null;
  runs: number;
  tokens: number;
}

function KpiCards({
  data,
  loading,
}: {
  data: KpiData | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  const cards = [
    {
      label: 'Total Cost',
      value: formatTotalCost(data?.totalCost ?? null),
      accent: true,
    },
    {
      label: 'Per Run',
      value:
        data?.avgPerRun !== null && data?.avgPerRun !== undefined
          ? `$${data.avgPerRun.toFixed(4)}`
          : '—',
      accent: false,
    },
    {
      label: 'Runs',
      value: loading ? '—' : formatNumber(data?.runs ?? 0),
      accent: false,
    },
    {
      label: 'Tokens',
      value: loading ? '—' : formatTokenCount(data?.tokens ?? 0),
      accent: false,
    },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.5, mb: 4, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <Box
          key={card.label}
          sx={{
            flex: '1 1 120px',
            minWidth: 120,
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
    </Box>
  );
}

// ── Section 2: Chain Cost Breakdown ───────────────────────────────────────────

function ChainCostBreakdown({
  items,
  loading,
  error,
}: {
  items: CostByChainItem[];
  loading: boolean;
  error: string | null;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  const sorted = [...items].sort(
    (a, b) => (b.total_cost ?? -1) - (a.total_cost ?? -1),
  );
  const maxCost = sorted[0]?.total_cost ?? 1;

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
          Chain Cost Breakdown
        </Typography>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Error */}
      {!loading && error && (
        <Box sx={{ p: 2.5 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <EmptyState title="No chain data for this period" size="sm" />
      )}

      {/* Rows */}
      {!loading &&
        !error &&
        sorted.map((item) => {
          const cost = item.total_cost ?? 0;
          const barFill = maxCost > 0 ? Math.max(0, Math.min(100, (cost / maxCost) * 100)) : 0;

          return (
            <Box
              key={`${item.agent_id}-${item.chain_name}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1.25,
                borderBottom: `1px solid ${colors.border.muted}`,
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              {/* Chain name */}
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: colors.fg.default,
                  fontFamily: monoFontFamily,
                  flex: '0 0 160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.chain_name}
              </Typography>

              {/* Cost */}
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: colors.accent.fg,
                  fontFamily: monoFontFamily,
                  fontVariantNumeric: 'tabular-nums',
                  flex: '0 0 72px',
                  textAlign: 'right',
                }}
              >
                {formatTotalCost(item.total_cost)}
              </Typography>

              {/* Bar */}
              <Box
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.border.muted,
                  overflow: 'hidden',
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

              {/* Calls */}
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  color: colors.fg.subtle,
                  fontVariantNumeric: 'tabular-nums',
                  flex: '0 0 60px',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatNumber(item.call_count)} calls
              </Typography>
            </Box>
          );
        })}
    </Box>
  );
}

// ── Section 3: Cost Trend (agent-scoped, by model) ────────────────────────────

function AgentCostTrendChart({
  period,
  agentId,
}: {
  period: UsagePeriod;
  agentId: string;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  const [buckets, setBuckets] = useState<Record<string, number | string>[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    setChartLoading(true);
    setChartError(null);
    modelPricingApi
      .costTimeseries(PERIOD_HOURS[period], 'model', agentId)
      .then((res) => {
        const byBucket = new Map<string, Record<string, number>>();
        const groupSet = new Set<string>();
        for (const row of res.buckets) {
          groupSet.add(row.group);
          if (!byBucket.has(row.bucket)) {
            byBucket.set(row.bucket, {
              bucket: row.bucket,
            } as unknown as Record<string, number>);
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
  }, [period, agentId]);

  const formatBucketLabel = (bucket: string) => {
    const d = new Date(bucket);
    if (isNaN(d.getTime())) return bucket;
    if (period === '24h')
      return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
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
        overflow: 'hidden',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ ...sectionLabelSx, color: colors.fg.subtle }}>
          Cost Trend by Model
        </Typography>
      </Box>

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
          <EmptyState title="No data for this period" size="sm" />
        </Box>
      )}

      {!chartLoading && !chartError && buckets.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {groups.map((g, i) => (
                <linearGradient key={g} id={`agent-trend-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
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
                fill={`url(#agent-trend-grad-${i})`}
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

// ── Section 4: Model Efficiency ────────────────────────────────────────────────

interface AlternativeModel {
  model_name: string;
  provider: string;
  input_cost_per_token: number | null;
  output_cost_per_token: number | null;
  savingsPct: number | null;
}

interface ModelEfficiencyRow {
  activeModel: ActiveModel;
  alternatives: AlternativeModel[];
}

function ModelEfficiency({
  agentModels,
  loading,
  error,
}: {
  agentModels: ActiveModel[];
  loading: boolean;
  error: string | null;
}) {
  const theme = useTheme();
  const colors = theme.colors;

  const [allModels, setAllModels] = useState<
    { model_name: string; provider: string; input_cost_per_token: number | null; output_cost_per_token: number | null }[]
  >([]);

  useEffect(() => {
    modelPricingApi
      .list({ limit: 200 })
      .then((res) => {
        setAllModels(
          res.items.map((m) => ({
            model_name: m.model_name,
            provider: m.provider,
            input_cost_per_token: m.input_cost_per_token,
            output_cost_per_token: m.output_cost_per_token,
          })),
        );
      })
      .catch(() => {});
  }, []);

  const rows: ModelEfficiencyRow[] = agentModels.map((active) => {
    const activeCostIn = active.input_cost_per_token ?? 0;
    const activeCostOut = active.output_cost_per_token ?? 0;
    const activeTotalCostPerToken =
      activeCostIn + activeCostOut > 0 ? (activeCostIn + activeCostOut) / 2 : null;

    const alts: AlternativeModel[] = allModels
      .filter(
        (m) =>
          m.model_name !== active.model_name &&
          m.input_cost_per_token !== null &&
          m.output_cost_per_token !== null,
      )
      .map((m) => {
        const altCostIn = m.input_cost_per_token ?? 0;
        const altCostOut = m.output_cost_per_token ?? 0;
        const altTotal = (altCostIn + altCostOut) / 2;

        const savings =
          activeTotalCostPerToken !== null && activeTotalCostPerToken > 0
            ? ((activeTotalCostPerToken - altTotal) / activeTotalCostPerToken) * 100
            : null;

        return {
          model_name: m.model_name,
          provider: m.provider,
          input_cost_per_token: m.input_cost_per_token,
          output_cost_per_token: m.output_cost_per_token,
          savingsPct: savings,
        };
      })
      .filter((a) => a.savingsPct !== null && a.savingsPct > 0)
      .sort((a, b) => (b.savingsPct ?? 0) - (a.savingsPct ?? 0))
      .slice(0, 3);

    return { activeModel: active, alternatives: alts };
  });

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
          Model Efficiency
        </Typography>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* Error */}
      {!loading && error && (
        <Box sx={{ p: 2.5 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {/* Empty */}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title="No model usage data for this period" size="sm" />
      )}

      {/* Model rows */}
      {!loading &&
        !error &&
        rows.map(({ activeModel, alternatives }) => {
          const pColor = providerColor(activeModel.provider ?? '');

          return (
            <Box
              key={activeModel.model_name}
              sx={{
                borderBottom: `1px solid ${colors.border.muted}`,
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              {/* Active model row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2.5,
                  py: 1.5,
                  borderLeft: `3px solid ${colors.success.fg}`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: colors.success.fg,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: colors.fg.default,
                    fontFamily: monoFontFamily,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activeModel.model_name}
                </Typography>

                {/* Provider badge */}
                {activeModel.provider && (
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
                      flexShrink: 0,
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
                      {activeModel.provider}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: colors.accent.fg,
                      fontFamily: monoFontFamily,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatTotalCost(activeModel.total_cost)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.6875rem',
                      color: colors.fg.subtle,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatTokenCount(activeModel.total_tokens)} tokens
                  </Typography>
                </Box>
              </Box>

              {/* Alternative models */}
              {alternatives.length > 0 && (
                <Box sx={{ pl: 5, pr: 2.5, pb: 1 }}>
                  {alternatives.map((alt) => {
                    const altColor = providerColor(alt.provider);
                    return (
                      <Box
                        key={alt.model_name}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          py: 0.75,
                          borderBottom: `1px solid ${colors.border.muted}`,
                          '&:last-of-type': { borderBottom: 'none' },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: colors.fg.muted,
                            fontFamily: monoFontFamily,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {alt.model_name}
                        </Typography>

                        {/* Alt provider */}
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 0.75,
                            py: 0.2,
                            borderRadius: '4px',
                            border: `1px solid ${altColor}30`,
                            backgroundColor: `${altColor}0D`,
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.625rem',
                              fontWeight: 500,
                              color: altColor,
                              textTransform: 'capitalize',
                            }}
                          >
                            {alt.provider}
                          </Typography>
                        </Box>

                        {/* Savings badge */}
                        {alt.savingsPct !== null && (
                          <Box
                            sx={{
                              px: '6px',
                              py: '2px',
                              borderRadius: '4px',
                              backgroundColor: colors.success.subtle,
                              border: `1px solid ${colors.success.muted}`,
                              flexShrink: 0,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: colors.success.fg,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              -{alt.savingsPct.toFixed(0)}% cheaper
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })}
    </Box>
  );
}

// ── Main AgentCostTab ──────────────────────────────────────────────────────────

export default function AgentCostTab() {
  const { agent } = useOutletContext<AgentDetailContext>();
  const { id: agentId } = useParams<{ id: string }>();
  const theme = useTheme();
  const colors = theme.colors;

  const [period, setPeriod] = useState<UsagePeriod>('all');

  // KPI data — derived from costByAgent filtered client-side
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // Chain breakdown
  const [chainItems, setChainItems] = useState<CostByChainItem[]>([]);
  const [chainLoading, setChainLoading] = useState(true);
  const [chainError, setChainError] = useState<string | null>(null);

  // Model efficiency
  const [agentModels, setAgentModels] = useState<ActiveModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Load KPI from costByAgent, filter by this agent
  useEffect(() => {
    if (!agentId) return;
    setKpiLoading(true);
    setKpiError(null);
    modelPricingApi
      .costByAgent(PERIOD_HOURS[period])
      .then((res) => {
        const thisAgent: CostByAgentItem | undefined = res.items.find(
          (item) => item.agent_id === agentId,
        );
        if (thisAgent) {
          const avgPerRun =
            thisAgent.total_cost !== null && thisAgent.run_count > 0
              ? thisAgent.total_cost / thisAgent.run_count
              : null;
          setKpiData({
            totalCost: thisAgent.total_cost,
            avgPerRun,
            runs: thisAgent.run_count,
            tokens: thisAgent.total_tokens,
          });
        } else {
          setKpiData({ totalCost: null, avgPerRun: null, runs: 0, tokens: 0 });
        }
      })
      .catch((err: Error) => setKpiError(err.message))
      .finally(() => setKpiLoading(false));
  }, [period, agentId]);

  // Load chain breakdown
  useEffect(() => {
    if (!agentId) return;
    setChainLoading(true);
    setChainError(null);
    modelPricingApi
      .costByChain(PERIOD_HOURS[period], agentId)
      .then((res) => setChainItems(res.items))
      .catch((err: Error) => setChainError(err.message))
      .finally(() => setChainLoading(false));
  }, [period, agentId]);

  // Load model efficiency via costSummary, then filter to models this agent used
  useEffect(() => {
    if (!agentId) return;
    setModelsLoading(true);
    setModelsError(null);

    // Use costTimeseries to find which models this agent uses
    modelPricingApi
      .costTimeseries(PERIOD_HOURS[period], 'model', agentId)
      .then((res) => {
        const modelNames = new Set(res.buckets.map((b) => b.group));
        // Then get costSummary to get per-model details
        return modelPricingApi.costSummary(PERIOD_HOURS[period]).then((summary) => {
          const filtered = summary.by_model.filter((m) => modelNames.has(m.model_name));
          setAgentModels(filtered);
        });
      })
      .catch((err: Error) => setModelsError(err.message))
      .finally(() => setModelsLoading(false));
  }, [period, agentId]);

  return (
    <Box>
      {/* Period selector header row */}
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
        <Typography
          sx={{
            ...sectionLabelSx,
            color: colors.fg.subtle,
            fontSize: '0.6875rem',
          }}
        >
          {agent.name} · Cost
        </Typography>
        <PeriodSelector period={period} onSelect={setPeriod} />
      </Box>

      {/* KPI error */}
      {kpiError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {kpiError}
        </Alert>
      )}

      {/* Section 1: KPI Cards */}
      <KpiCards data={kpiData} loading={kpiLoading} />

      {/* Section 2: Chain Cost Breakdown */}
      <ChainCostBreakdown items={chainItems} loading={chainLoading} error={chainError} />

      {/* Section 3: Cost Trend (agent-scoped) */}
      {agentId && <AgentCostTrendChart period={period} agentId={agentId} />}

      {/* Section 4: Model Efficiency */}
      <ModelEfficiency agentModels={agentModels} loading={modelsLoading} error={modelsError} />
    </Box>
  );
}
