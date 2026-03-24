import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import type { AgentHealthStatus, MonitoringSummary } from '../types/monitoring';
import { monitoringApi } from '../services/monitoringApi';
import { monoFontFamily } from '../theme';
import EmptyState from '../components/EmptyState';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLatency(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ pct, invert }: { pct: number | null; invert?: boolean }) {
  const theme = useTheme();
  const colors = theme.colors;
  if (pct === null) return null;
  const isPositive = pct > 0;
  const isGood = invert ? !isPositive : isPositive;
  const color = isGood ? colors.success.fg : colors.danger.fg;
  const bg = isGood ? colors.success.subtle : colors.danger.subtle;
  const arrow = isPositive ? '↑' : '↓';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: '5px',
        py: '2px',
        borderRadius: '4px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color,
        backgroundColor: bg,
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
    </Box>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  trend: number | null;
  invertTrend?: boolean;
  alert?: boolean;
}

function KpiCard({ label, value, trend, invertTrend, alert }: KpiCardProps) {
  const theme = useTheme();
  const colors = theme.colors;
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: 2.5,
        py: 2,
        borderRadius: '8px',
        border: `1px solid ${alert ? alpha(colors.danger.fg, 0.3) : colors.border.muted}`,
        background: alert ? alpha(colors.danger.fg, 0.04) : colors.canvas.subtle,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.625rem',
          fontWeight: 600,
          color: colors.fg.subtle,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography
          sx={{
            fontSize: '1.75rem',
            fontWeight: 600,
            color: alert ? colors.danger.fg : colors.fg.default,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
        <TrendBadge pct={trend} invert={invertTrend} />
      </Box>
    </Box>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentHealthStatus }) {
  const theme = useTheme();
  const colors = theme.colors;

  const config: Record<AgentHealthStatus, { color: string; bg: string; border: string; label: string; tooltip: string }> = {
    healthy: {
      color: colors.success.fg,
      bg: colors.success.subtle,
      border: colors.success.muted,
      label: 'Healthy',
      tooltip: 'Operating normally with stable usage',
    },
    warning: {
      color: colors.attention.fg,
      bg: colors.attention.subtle,
      border: colors.attention.muted,
      label: 'Warning',
      tooltip: 'Elevated error rate or latency spike detected — review recommended',
    },
    critical: {
      color: colors.danger.fg,
      bg: colors.danger.subtle,
      border: colors.danger.muted,
      label: 'Critical',
      tooltip: 'Critical error rate — immediate action required',
    },
    dormant: {
      color: colors.fg.subtle,
      bg: colors.canvas.elevated,
      border: colors.border.default,
      label: 'Dormant',
      tooltip: 'No recent activity — consider deprecating or reactivating',
    },
    down: {
      color: colors.danger.fg,
      bg: colors.danger.subtle,
      border: colors.danger.muted,
      label: 'Down',
      tooltip: 'Availability check failing — endpoint unreachable',
    },
    degraded: {
      color: colors.attention.fg,
      bg: colors.attention.subtle,
      border: colors.attention.muted,
      label: 'Degraded',
      tooltip: 'Degraded availability — elevated latency or intermittent failures detected',
    },
  };

  const { color, bg, border, label, tooltip } = config[status];

  return (
    <Tooltip title={tooltip} placement="top">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.875,
          py: 0.375,
          borderRadius: '4px',
          border: `1px solid ${border}`,
          backgroundColor: bg,
          cursor: 'default',
        }}
      >
        <Box
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: color,
            flexShrink: 0,
            ...((status === 'critical' || status === 'down') && {
              animation: 'statusPulse 1.5s ease-in-out infinite',
              '@keyframes statusPulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.35 },
              },
            }),
          }}
        />
        <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color, lineHeight: 1 }}>
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  const theme = useTheme();
  const colors = theme.colors;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 1.5,
        pb: 1,
        borderBottom: `1px solid ${colors.border.muted}`,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: colors.fg.subtle,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      {count !== undefined && (
        <Box
          sx={{
            px: 0.875,
            py: 0.125,
            borderRadius: '4px',
            background: colors.canvas.elevated,
            border: `1px solid ${colors.border.muted}`,
          }}
        >
          <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle, lineHeight: 1.4 }}>
            {count}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ── Table head cell (shared style) ────────────────────────────────────────────

function TH({ label, width }: { label: string; width: string }) {
  const theme = useTheme();
  const colors = theme.colors;
  return (
    <TableCell
      sx={{
        width,
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: colors.fg.subtle,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        py: 1,
        backgroundColor: colors.canvas.subtle,
      }}
    >
      {label}
    </TableCell>
  );
}

// ── Range options ─────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: 1, label: '1h' },
  { value: 24, label: '24h' },
  { value: 168, label: '7d' },
] as const;

type RangeHours = 1 | 24 | 168;

const RANGE_ORDER: RangeHours[] = [1, 24, 168];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const theme = useTheme();
  const colors = theme.colors;
  const navigate = useNavigate();

  const [rangeHours, setRangeHours] = useState<RangeHours>(1);
  const [isAdaptive, setIsAdaptive] = useState(true);
  const [data, setData] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [healthPage, setHealthPage] = useState(1);
  const [slowPage, setSlowPage] = useState(1);
  const PAGE_SIZE = 30;

  const load = useCallback((hours: RangeHours) => {
    setLoading(true);
    setError(null);
    monitoringApi
      .summary(hours)
      .then((d) => {
        setData(d);
        setLastRefreshed(new Date());
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load(rangeHours);
    setHealthPage(1);
    setSlowPage(1);
  }, [rangeHours, load]);

  // Adaptive: if no data at current range, escalate to the next wider range
  useEffect(() => {
    if (!isAdaptive || loading || !data) return;
    const isEmpty = (data.kpi?.total_runs ?? 0) === 0;
    if (!isEmpty) return;
    const nextRange = RANGE_ORDER[RANGE_ORDER.indexOf(rangeHours) + 1];
    if (nextRange) setRangeHours(nextRange);
  }, [data, loading, isAdaptive, rangeHours]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(rangeHours);
  };

  const handleRangeChange = (_: React.MouseEvent, v: RangeHours | null) => {
    if (v) {
      setIsAdaptive(false);
      setRangeHours(v);
    }
  };

  const agentHealth = data?.agent_health ?? [];
  const slowChains = data?.slow_chains ?? [];
  const kpi = data?.kpi ?? null;
  const anomalyCount = agentHealth.filter((r) => r.status === 'critical' || r.status === 'warning').length;
  const dormantCount = agentHealth.filter((r) => r.status === 'dormant').length;
  const downCount = agentHealth.filter((r) => r.status === 'down').length;

  const STATUS_ORDER: Record<string, number> = { down: 0, degraded: 1, critical: 2, warning: 3, healthy: 4, dormant: 5 };
  const sortedHealth = [...agentHealth].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4),
  );

  const pagedHealth = sortedHealth.slice((healthPage - 1) * PAGE_SIZE, healthPage * PAGE_SIZE);
  const healthTotalPages = Math.ceil(agentHealth.length / PAGE_SIZE);
  const pagedSlowChains = slowChains.slice((slowPage - 1) * PAGE_SIZE, slowPage * PAGE_SIZE);
  const slowTotalPages = Math.ceil(slowChains.length / PAGE_SIZE);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: colors.fg.default, lineHeight: 1.2 }}>
            Monitoring
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle, mt: 0.25 }}>
            Agent health &amp; performance overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lastRefreshed && (
            <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle }}>
              Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <Box
              onClick={handleRefresh}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '6px',
                border: `1px solid ${colors.border.default}`,
                cursor: 'pointer',
                color: colors.fg.muted,
                transition: 'all 0.1s',
                '&:hover': {
                  borderColor: colors.border.hover,
                  color: colors.fg.default,
                  background: colors.canvas.elevated,
                },
              }}
            >
              <RefreshOutlinedIcon
                sx={{
                  fontSize: 14,
                  ...(refreshing && {
                    animation: 'spinRefresh 0.8s linear infinite',
                    '@keyframes spinRefresh': {
                      from: { transform: 'rotate(0deg)' },
                      to: { transform: 'rotate(360deg)' },
                    },
                  }),
                }}
              />
            </Box>
          </Tooltip>
          <ToggleButtonGroup size="small" value={rangeHours} exclusive onChange={handleRangeChange}>
            {RANGE_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.value}
                value={opt.value}
                sx={{ fontSize: '0.75rem', px: 1.5, textTransform: 'none' }}
              >
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* ── Error ── */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* ── Initial loading ── */}
      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {data && (
        <>
          {/* ── KPI Row ── */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <KpiCard
              label="Total Runs"
              value={formatCount(kpi?.total_runs ?? 0)}
              trend={kpi?.trend?.total_runs_pct ?? null}
            />
            <KpiCard
              label="Error Rate"
              value={formatPct(kpi?.error_rate ?? 0)}
              trend={kpi?.trend?.error_rate_pct ?? null}
              invertTrend
              alert={(kpi?.error_rate ?? 0) > 0.1}
            />
            <KpiCard
              label="Avg Latency"
              value={formatLatency(kpi?.avg_latency_ms ?? null)}
              trend={kpi?.trend?.avg_latency_pct ?? null}
              invertTrend
            />
            <KpiCard
              label="p95 Latency"
              value={formatLatency(kpi?.p95_latency_ms ?? null)}
              trend={kpi?.trend?.p95_latency_pct ?? null}
              invertTrend
            />
          </Box>

          {/* ── Agent Health ── */}
          <Box>
            <SectionHeader title="Agent Health" count={agentHealth.length} />
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                mb: 1.5,
                borderRadius: '6px',
                border: `1px solid ${alpha(colors.accent.fg, 0.2)}`,
                background: alpha(colors.accent.fg, 0.05),
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, mb: 0.5 }}>
                Agent health is determined by three axes:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { fontSize: '0.8125rem', color: colors.fg.muted, mb: 0.25 } }}>
                <li>
                  <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.default }}>
                    Operational health
                  </Typography>
                  {' — based on error rate and latency spikes'}
                  <Box component="ul" sx={{ mt: 0.25, pl: 2, '& li': { fontSize: '0.8125rem', color: colors.fg.muted, mb: 0 } }}>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.danger.fg }}>Critical:</Typography> Error rate exceeds 20%. Immediate action required.</li>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.attention.fg }}>Warning:</Typography> Error rate exceeds 5%, or a latency spike is detected.</li>
                  </Box>
                </li>
                <li>
                  <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.default }}>
                    Usage health
                  </Typography>
                  {' — based on activity within the selected time range'}
                  <Box component="ul" sx={{ mt: 0.25, pl: 2, '& li': { fontSize: '0.8125rem', color: colors.fg.muted, mb: 0 } }}>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.fg.subtle }}>Dormant:</Typography> No runs recorded and last activity exceeds 2× the selected range.</li>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.success.fg }}>Healthy:</Typography> Operating normally with stable usage.</li>
                  </Box>
                </li>
                <li>
                  <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.default }}>
                    Availability
                  </Typography>
                  {' — based on periodic HTTP health checks (if configured)'}
                  <Box component="ul" sx={{ mt: 0.25, pl: 2, '& li': { fontSize: '0.8125rem', color: colors.fg.muted, mb: 0 } }}>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.danger.fg }}>Down:</Typography> Health check endpoint unreachable or returning errors.</li>
                    <li><Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.attention.fg }}>Degraded:</Typography> Intermittent failures or elevated response latency detected.</li>
                  </Box>
                </li>
              </Box>
            </Box>

            {/* Anomaly banner — critical + warning */}
            {anomalyCount > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.875,
                  mb: 1,
                  borderRadius: '6px',
                  border: `1px solid ${alpha(colors.attention.fg, 0.3)}`,
                  background: colors.attention.subtle,
                }}
              >
                <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: colors.attention.fg }} />
                <Typography sx={{ fontSize: '0.8125rem', color: colors.attention.fg, fontWeight: 500 }}>
                  {anomalyCount} agent{anomalyCount !== 1 ? 's' : ''} with anomalies detected
                </Typography>
              </Box>
            )}

            {/* Down banner */}
            {downCount > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.875,
                  mb: 1,
                  borderRadius: '6px',
                  border: `1px solid ${colors.danger.muted}`,
                  background: colors.danger.subtle,
                }}
              >
                <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: colors.danger.fg }} />
                <Typography sx={{ fontSize: '0.8125rem', color: colors.danger.fg, fontWeight: 500 }}>
                  {downCount} agent{downCount !== 1 ? 's' : ''} down — availability check failing
                </Typography>
              </Box>
            )}

            {/* Dormant banner */}
            {dormantCount > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.875,
                  mb: 1.5,
                  borderRadius: '6px',
                  border: `1px solid ${colors.border.default}`,
                  background: colors.canvas.elevated,
                }}
              >
                <HistoryOutlinedIcon sx={{ fontSize: 13, color: colors.fg.subtle }} />
                <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontWeight: 500 }}>
                  {dormantCount} agent{dormantCount !== 1 ? 's' : ''} dormant — no recent activity
                </Typography>
              </Box>
            )}

            {agentHealth.length === 0 ? (
              <EmptyState
                icon={<MonitorHeartOutlinedIcon />}
                title="No agent data"
                description="Run some agent operations to see health metrics"
                size="md"
                bordered
              />
            ) : (
              <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TH label="Agent" width="20%" />
                      <TH label="Runs" width="8%" />
                      <TH label="Error Rate" width="10%" />
                      <TH label="Avg Latency" width="12%" />
                      <TH label="p95 Latency" width="12%" />
                      <TH label="Null Rate" width="10%" />
                      <TH label="Availability" width="14%" />
                      <TH label="Status" width="14%" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedHealth.map((row) => {
                      const isCritical = row.status === 'critical';
                      const isWarning = row.status === 'warning';
                      const isDormant = row.status === 'dormant';
                      return (
                        <TableRow
                          key={row.agent_id}
                          onClick={() => navigate(`/agents/${row.agent_id}`)}
                          sx={{
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                            ...(row.status === 'down' && {
                              backgroundColor: alpha(colors.danger.fg, 0.04),
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.danger.fg}`,
                                pl: '13px',
                              },
                            }),
                            ...(row.status === 'degraded' && {
                              backgroundColor: alpha(colors.attention.fg, 0.04),
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.attention.fg}`,
                                pl: '13px',
                              },
                            }),
                            ...(isCritical && {
                              backgroundColor: alpha(colors.danger.fg, 0.04),
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.danger.fg}`,
                                pl: '13px',
                              },
                            }),
                            ...(isWarning && {
                              backgroundColor: alpha(colors.attention.fg, 0.04),
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.attention.fg}`,
                                pl: '13px',
                              },
                            }),
                            ...(isDormant && {
                              backgroundColor: alpha(colors.fg.subtle, 0.03),
                              '& td:first-of-type': {
                                borderLeft: `3px solid ${colors.border.default}`,
                                pl: '13px',
                              },
                            }),
                            '&:hover': {
                              backgroundColor:
                                row.status === 'down'
                                  ? alpha(colors.danger.fg, 0.07)
                                  : row.status === 'degraded'
                                  ? alpha(colors.attention.fg, 0.07)
                                  : isCritical
                                  ? alpha(colors.danger.fg, 0.07)
                                  : isWarning
                                  ? alpha(colors.attention.fg, 0.07)
                                  : isDormant
                                  ? alpha(colors.fg.subtle, 0.06)
                                  : colors.canvas.elevated,
                            },
                          }}
                        >
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: isDormant ? colors.fg.muted : colors.fg.default }}>
                              {row.agent_name}
                            </Typography>
                            {isDormant && (
                              <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle, mt: 0.25, lineHeight: 1 }}>
                                Last active: {formatTimeAgo(row.last_run_at)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatCount(row.runs)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: row.error_rate > 0.05 ? 500 : 400,
                                color:
                                  row.error_rate > 0.2
                                    ? colors.danger.fg
                                    : row.error_rate > 0.05
                                    ? colors.attention.fg
                                    : colors.fg.muted,
                              }}
                            >
                              {formatPct(row.error_rate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatLatency(row.avg_latency_ms)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatLatency(row.p95_latency_ms)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                fontVariantNumeric: 'tabular-nums',
                                color: row.null_rate > 0.3 ? colors.attention.fg : colors.fg.muted,
                              }}
                            >
                              {formatPct(row.null_rate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.availability == null ? (
                              <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
                                —
                              </Typography>
                            ) : (
                              <Tooltip
                                title={
                                  row.availability_latency_ms != null
                                    ? `Latency: ${formatLatency(row.availability_latency_ms)}`
                                    : ''
                                }
                                placement="top"
                              >
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    px: 0.875,
                                    py: 0.375,
                                    borderRadius: '4px',
                                    border: `1px solid ${
                                      row.availability === 'down'
                                        ? colors.danger.muted
                                        : row.availability === 'degraded'
                                        ? colors.attention.muted
                                        : colors.success.muted
                                    }`,
                                    backgroundColor:
                                      row.availability === 'down'
                                        ? colors.danger.subtle
                                        : row.availability === 'degraded'
                                        ? colors.attention.subtle
                                        : colors.success.subtle,
                                    cursor: 'default',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 5,
                                      height: 5,
                                      borderRadius: '50%',
                                      backgroundColor:
                                        row.availability === 'down'
                                          ? colors.danger.fg
                                          : row.availability === 'degraded'
                                          ? colors.attention.fg
                                          : colors.success.fg,
                                      flexShrink: 0,
                                    }}
                                  />
                                  <Typography
                                    sx={{
                                      fontSize: '0.6875rem',
                                      fontWeight: 600,
                                      color:
                                        row.availability === 'down'
                                          ? colors.danger.fg
                                          : row.availability === 'degraded'
                                          ? colors.attention.fg
                                          : colors.success.fg,
                                      lineHeight: 1,
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {row.availability}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={row.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {healthTotalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination count={healthTotalPages} page={healthPage} onChange={(_, v) => setHealthPage(v)} size="small" />
                </Box>
              )}
              </>
            )}
          </Box>

          {/* ── Slow Chains ── */}
          <Box>
            <SectionHeader title="Slow Chains" count={slowChains.length} />
            {slowChains.length === 0 ? (
              <EmptyState
                icon={<SpeedOutlinedIcon />}
                title="No slow chains"
                description="All chains are within expected latency ranges"
                size="md"
                bordered
              />
            ) : (
              <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TH label="Agent" width="26%" />
                      <TH label="Chain" width="30%" />
                      <TH label="p95 Latency" width="24%" />
                      <TH label="Calls" width="20%" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedSlowChains.map((row, i) => {
                      const maxP95 = slowChains[0]?.p95_latency_ms ?? 1;
                      const barWidth = Math.round((row.p95_latency_ms / maxP95) * 40);
                      const latencyColor =
                        row.p95_latency_ms > 10000
                          ? colors.danger.fg
                          : row.p95_latency_ms > 3000
                          ? colors.attention.fg
                          : colors.fg.subtle;
                      return (
                        <TableRow
                          key={`${row.agent_id}-${row.chain_name}-${i}`}
                          onClick={() =>
                            row.chain_id
                              ? navigate(`/agents/${row.agent_id}/chains/${row.chain_id}/logs`)
                              : navigate(`/agents/${row.agent_id}`)
                          }
                          sx={{
                            cursor: 'pointer',
                            transition: 'background 0.1s',
                            '&:hover': { backgroundColor: colors.canvas.elevated },
                          }}
                        >
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted }}>
                              {row.agent_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: colors.fg.default,
                                fontFamily: monoFontFamily,
                              }}
                            >
                              {row.chain_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography
                                sx={{
                                  fontSize: '0.8125rem',
                                  fontVariantNumeric: 'tabular-nums',
                                  fontWeight: row.p95_latency_ms > 3000 ? 500 : 400,
                                  color: latencyColor,
                                }}
                              >
                                {formatLatency(row.p95_latency_ms)}
                              </Typography>
                              <Box
                                sx={{
                                  height: 3,
                                  width: barWidth,
                                  borderRadius: 1,
                                  background: latencyColor,
                                  flexShrink: 0,
                                  opacity: 0.6,
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontVariantNumeric: 'tabular-nums' }}>
                              {formatCount(row.calls)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {slowTotalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination count={slowTotalPages} page={slowPage} onChange={(_, v) => setSlowPage(v)} size="small" />
                </Box>
              )}
              </>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
