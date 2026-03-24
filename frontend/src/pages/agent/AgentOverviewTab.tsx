import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { AgentDetailContext } from '../../types/agentDetail';
import type { HealthConfig, HealthCheckLog } from '../../types/healthCheck';
import { agentApi } from '../../services/agentApi';
import { monoFontFamily } from '../../theme';
import { formatDateTime } from '../../utils/date';

// ── Health Check helpers ───────────────────────────────────────────────────────

// Treat checked_at as UTC if no timezone info is present
const parseTime = (t: string) =>
  new Date(t.endsWith('Z') || t.includes('+') ? t : t + 'Z').getTime();

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeFull(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Status mini-badge ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: HealthCheckLog['status'] }) {
  const theme = useTheme();
  const colors = theme.colors;
  const isUp = status === 'up';
  const color = isUp ? colors.success.fg : colors.danger.fg;
  const bg = isUp ? colors.success.subtle : colors.danger.subtle;
  const border = isUp ? colors.success.muted : colors.danger.muted;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
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
      }}
    >
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color, lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ── Chart tooltip ──────────────────────────────────────────────────────────────

function HealthChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { status: string; status_code: number | null; error_message: string | null } }[];
  label?: string;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  if (!active || !payload?.length || !label) return null;
  const rawLatency = payload[0]?.value ?? 0;
  const latency = rawLatency > 0 ? rawLatency : null;
  const { status, status_code, error_message } = payload[0]?.payload ?? {};
  const isUp = status === 'up';
  const statusColor = isUp ? colors.success.fg : colors.danger.fg;
  return (
    <Box
      sx={{
        background: colors.canvas.overlay,
        border: `1px solid ${colors.border.default}`,
        borderRadius: '6px',
        p: '8px 12px',
        minWidth: 160,
        maxWidth: 260,
      }}
    >
      <Typography sx={{ fontSize: 11, color: colors.fg.muted, mb: 0.5 }}>
        {formatTimeFull(label)}
      </Typography>
      {status && (
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: statusColor, mb: 0.25 }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
          {status_code != null && ` — HTTP ${status_code}`}
        </Typography>
      )}
      {latency !== null && (
        <Typography sx={{ fontSize: 12, color: colors.fg.default, mb: error_message ? 0.25 : 0 }}>
          Latency: {formatMs(latency)}
        </Typography>
      )}
      {error_message && (
        <Typography sx={{ fontSize: 11, color: colors.danger.fg, wordBreak: 'break-word' }}>
          {error_message}
        </Typography>
      )}
    </Box>
  );
}

// ── Health Check Section ───────────────────────────────────────────────────────

function HealthCheckSection({ agentId }: { agentId: string }) {
  const theme = useTheme();
  const colors = theme.colors;

  const [config, setConfig] = useState<HealthConfig | null>(null);
  const [logs, setLogs] = useState<HealthCheckLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeHours, setRangeHours] = useState<1 | 6 | 24>(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await agentApi.getHealthConfig(agentId);
      setConfig(cfg);
      const fetchedLogs = await agentApi.getHealthCheckLogs(agentId, 1440);
      setLogs(fetchedLogs);
    } catch (err: unknown) {
      // 404 = no config, silently hide section
      if (!(err instanceof Error && err.message.includes('404'))) {
        // other errors: still hide gracefully
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const fetchedLogs = await agentApi.getHealthCheckLogs(agentId, 1440);
      setLogs(fetchedLogs);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (!config) return null;

  // Sort ascending; filter by selected range
  const rangeCutoff = Date.now() - rangeHours * 60 * 60 * 1000;
  const sorted = [...logs]
    .sort((a, b) => parseTime(a.checked_at) - parseTime(b.checked_at))
    .filter((l) => parseTime(l.checked_at) >= rangeCutoff);

  // Current status = most recent log
  const latestLog = sorted[sorted.length - 1] ?? null;

  // Uptime over last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent24h = sorted.filter((l) => parseTime(l.checked_at) >= cutoff);
  const uptime =
    recent24h.length === 0
      ? null
      : (recent24h.filter((l) => l.status === 'up').length / recent24h.length) * 100;

  // p95 latency from up logs
  const upLatencies = sorted
    .filter((l) => l.status === 'up' && l.latency_ms !== null)
    .map((l) => l.latency_ms as number)
    .sort((a, b) => a - b);
  const p95 =
    upLatencies.length >= 5
      ? upLatencies[Math.floor(upLatencies.length * 0.95)]
      : null;

  // Chart data
  const chartData = sorted.map((l) => ({
    time: l.checked_at,
    latency: l.latency_ms ?? 0,
    status: l.status,
    status_code: l.status_code,
    error_message: l.error_message,
  }));

  return (
    <Box
      sx={{
        border: `1px solid ${colors.border.muted}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          backgroundColor: colors.canvas.subtle,
          borderBottom: `1px solid ${colors.border.muted}`,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Health Check
        </Typography>
        {latestLog && <StatusDot status={latestLog.status} />}
        {uptime !== null && (
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.muted }}>
            {uptime.toFixed(1)}% uptime (24h)
          </Typography>
        )}
        {uptime === null && (
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>— uptime</Typography>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={rangeHours}
            onChange={(_, v: 1 | 6 | 24 | null) => { if (v) setRangeHours(v); }}
          >
            {([1, 6, 24] as const).map((h) => (
              <ToggleButton
                key={h}
                value={h}
                sx={{ fontSize: '0.6875rem', px: 1, py: 0.25, textTransform: 'none', lineHeight: 1.6 }}
              >
                {h}h
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{
                p: 0.375,
                color: colors.fg.subtle,
                '&:hover': { color: colors.fg.default, backgroundColor: 'transparent' },
              }}
            >
              <RefreshOutlinedIcon
                sx={{
                  fontSize: 14,
                  ...(refreshing && {
                    animation: 'healthRefreshSpin 0.8s linear infinite',
                    '@keyframes healthRefreshSpin': {
                      from: { transform: 'rotate(0deg)' },
                      to: { transform: 'rotate(360deg)' },
                    },
                  }),
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 2, backgroundColor: colors.canvas.default }}>
        {/* Chart */}
        {chartData.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 120,
              borderRadius: 1,
              border: `1px dashed ${colors.border.muted}`,
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.subtle }}>
              No health check data yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 20, bottom: 0, left: 4 }}>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke={colors.border.muted}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTimeShort}
                  tick={{ fontSize: 10, fill: colors.fg.subtle }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tickFormatter={(v: number) => formatMs(v)}
                  tick={{ fontSize: 10, fill: colors.fg.subtle }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <RechartsTooltip
                  content={<HealthChartTooltip />}
                  cursor={{ stroke: colors.border.default, strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke={colors.fg.muted}
                  strokeWidth={1.5}
                  dot={(props: { cx?: number; cy?: number; payload?: { status: string } }) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || payload == null) return <g />;
                    const color =
                      payload.status === 'up' ? colors.success.fg : colors.danger.fg;
                    const r = rangeHours === 24 ? 2 : rangeHours === 6 ? 2.5 : 3;
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={color}
                        stroke={colors.canvas.default}
                        strokeWidth={1}
                      />
                    );
                  }}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {p95 !== null && (
                  <ReferenceLine
                    y={p95}
                    stroke={colors.attention.fg}
                    strokeOpacity={0.7}
                    strokeDasharray="4 3"
                    label={(props: { viewBox?: { x: number; y: number; width: number } }) => {
                      const vb = props.viewBox;
                      if (!vb) return null;
                      const text = `p95 ${formatMs(p95)}`;
                      const tw = text.length * 5.6 + 8;
                      const lx = vb.x + vb.width - tw - 2;
                      const ly = vb.y - 14;
                      return (
                        <g>
                          <rect x={lx} y={ly} width={tw} height={13} rx={2}
                            fill={colors.canvas.overlay} fillOpacity={0.92}
                            stroke={colors.attention.muted} strokeWidth={0.75}
                          />
                          <text x={lx + tw / 2} y={ly + 6.5} fontSize={9.5} fontWeight={600}
                            fill={colors.attention.fg} textAnchor="middle" dominantBaseline="middle"
                          >
                            {text}
                          </text>
                        </g>
                      );
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────

export default function AgentOverviewTab() {
  const { agent, setAgent } = useOutletContext<AgentDetailContext>();
  const theme = useTheme();
  const colors = theme.colors;

  const [copied, setCopied] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(agent.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleStartEdit() {
    setDescValue(agent.description ?? '');
    setSaveError(null);
    setEditingDesc(true);
  }

  function handleCancelDesc() {
    setEditingDesc(false);
    setSaveError(null);
  }

  async function handleSaveDesc() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await agentApi.update(agent.id, { description: descValue.trim() || undefined });
      setAgent(updated);
      setEditingDesc(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleDescKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleCancelDesc();
    if (e.key === 'Enter' && e.ctrlKey) handleSaveDesc();
  }

  return (
    <Box sx={{ display: 'flex', gap: 3.5, alignItems: 'flex-start' }}>

      {/* ── Left column ── */}
      <Box sx={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* About card */}
        <Box
          sx={{
            border: `1px solid ${colors.border.muted}`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.25,
              backgroundColor: colors.canvas.subtle,
              borderBottom: `1px solid ${colors.border.muted}`,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              About
            </Typography>
            {!editingDesc && (
              <Button
                size="small"
                startIcon={<EditOutlinedIcon sx={{ fontSize: 13 }} />}
                onClick={handleStartEdit}
                disableRipple
                sx={{
                  color: colors.fg.subtle,
                  fontSize: '0.75rem',
                  minHeight: 'auto',
                  py: 0.25,
                  px: 0.75,
                  '&:hover': { color: colors.fg.default, backgroundColor: 'transparent' },
                }}
              >
                Edit
              </Button>
            )}
          </Box>

          {/* Card body */}
          <Box
            sx={{
              px: 2,
              py: 2,
              backgroundColor: colors.canvas.default,
              minHeight: 96,
            }}
          >
            {editingDesc ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  maxRows={8}
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  onKeyDown={handleDescKeyDown}
                  autoFocus
                  placeholder="Add a description..."
                  size="small"
                />
                {saveError && (
                  <Typography sx={{ fontSize: '0.75rem', color: colors.danger.fg }}>
                    {saveError}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={handleSaveDesc} disabled={saving}>
                    {saving ? <CircularProgress size={12} color="inherit" /> : 'Save'}
                  </Button>
                  <Button size="small" variant="outlined" onClick={handleCancelDesc} disabled={saving}>
                    Cancel
                  </Button>
                  <Typography variant="caption" sx={{ color: colors.fg.subtle, ml: 'auto' }}>
                    Ctrl+Enter to save
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  color: agent.description ? colors.fg.default : colors.fg.subtle,
                  fontStyle: agent.description ? 'normal' : 'italic',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {agent.description ?? 'No description — click Edit to add one.'}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Health Check section */}
        <HealthCheckSection agentId={agent.id} />

      </Box>

      {/* ── Right: Metadata sidebar ── */}
      <Box
        sx={{
          flexShrink: 0,
          width: 260,
          borderLeft: `1px solid ${colors.border.muted}`,
          pl: 3,
          pt: 0.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {/* Agent ID */}
        <Box>
          <Typography
            variant="body2"
            sx={{ color: colors.fg.subtle, fontWeight: 500, mb: 0.75 }}
          >
            Agent ID
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 0.5,
              background: colors.canvas.inset,
              border: `1px solid ${colors.border.muted}`,
              borderRadius: 1,
              px: 1,
              py: '5px',
            }}
          >
            <Typography
              sx={{
                fontFamily: monoFontFamily,
                fontSize: '0.6875rem',
                color: colors.fg.default,
                userSelect: 'all',
                flex: 1,
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}
            >
              {agent.id}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy ID'}>
              <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25, flexShrink: 0 }}>
                {copied ? (
                  <CheckIcon sx={{ fontSize: 13, color: colors.success.fg }} />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Created */}
        <Box>
          <Typography
            variant="body2"
            sx={{ color: colors.fg.subtle, fontWeight: 500, mb: 0.25 }}
          >
            Created
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.default }}>
            {formatDateTime(agent.created_at)}
          </Typography>
        </Box>

        {/* Updated */}
        <Box>
          <Typography
            variant="body2"
            sx={{ color: colors.fg.subtle, fontWeight: 500, mb: 0.25 }}
          >
            Updated
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.default }}>
            {formatDateTime(agent.updated_at)}
          </Typography>
        </Box>
      </Box>

    </Box>
  );
}
