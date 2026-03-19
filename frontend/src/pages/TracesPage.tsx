import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Pagination,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import type { Agent } from '../types/agent';
import type { RunSummary, RunDetail, RunChainCall } from '../types/run';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { runsApi } from '../services/runsApi';
import { monoFontFamily } from '../theme';
import StackTraceModal from '../components/StackTraceModal';

// ── JSON highlight (same as ChainDetailPage) ──────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tryFormatJson(text: string): { formatted: string; isJson: boolean } {
  try {
    const parsed = JSON.parse(text);
    return { formatted: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { formatted: text, isJson: false };
  }
}

const JSON_HIGHLIGHT_PALETTE: Record<'dark' | 'light', {
  key: string; string: string; number: string; boolean: string; null: string; punctuation: string;
}> = {
  dark: { key: '#d2a8ff', string: '#a5d6ff', number: '#79c0ff', boolean: '#ff7b72', null: '#8b949e', punctuation: '#656d76' },
  light: { key: '#953800', string: '#0a3069', number: '#0550ae', boolean: '#cf222e', null: '#6e7781', punctuation: '#57606a' },
};

function highlightJson(formatted: string, mode: 'dark' | 'light' = 'dark'): string {
  const p = JSON_HIGHLIGHT_PALETTE[mode];
  return escapeHtml(formatted).replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}[\],:])/g,
    (match) => {
      let color: string;
      if (match.startsWith('"')) {
        color = match.trimEnd().endsWith(':') ? p.key : p.string;
      } else if (match === 'true' || match === 'false') {
        color = p.boolean;
      } else if (match === 'null') {
        color = p.null;
      } else if (/^-?\d/.test(match)) {
        color = p.number;
      } else {
        color = p.punctuation;
      }
      return `<span style="color:${color}">${match}</span>`;
    },
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const AGENT_DOT_COLORS = ['#58a6ff', '#3fb950', '#f78166', '#d2a8ff', '#ffa657', '#79c0ff', '#56d364', '#ff7b72'];

function agentDotColor(agentId: string): string {
  let hash = 0;
  for (const ch of agentId) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  return AGENT_DOT_COLORS[hash % AGENT_DOT_COLORS.length];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type TimeRange = '1h' | '24h' | '7d';

function timeRangeToAfter(range: TimeRange): string {
  const now = Date.now();
  const offsets: Record<TimeRange, number> = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
  return new Date(now - offsets[range]).toISOString();
}

const PAGE_SIZE = 30;

// ── Model badge helpers ───────────────────────────────────────────────────────

function getUniqueModels(calls: RunChainCall[]): string[] {
  const seen = new Set<string>();
  for (const c of calls) {
    if (c.model_name !== null) seen.add(c.model_name);
  }
  return [...seen];
}

function RunModelBadge({ models }: { models: string[] }) {
  const theme = useTheme();
  const colors = theme.colors;

  if (models.length === 0) return null;

  if (models.length === 1) {
    return (
      <Chip
        icon={<SmartToyOutlinedIcon sx={{ fontSize: '0.7rem !important' }} />}
        label={models[0]}
        size="small"
        variant="outlined"
        sx={{
          height: 20,
          fontSize: '0.6875rem',
          color: colors.fg.muted,
          borderColor: colors.border.muted,
          backgroundColor: 'transparent',
          '& .MuiChip-label': { px: 0.75 },
          '& .MuiChip-icon': { color: colors.fg.subtle, ml: 0.5 },
        }}
      />
    );
  }

  // Multiple models
  return (
    <Tooltip
      title={models.join(', ')}
      placement="top"
    >
      <Chip
        icon={<SmartToyOutlinedIcon sx={{ fontSize: '0.7rem !important' }} />}
        label={`${models[0]} +${models.length - 1}`}
        size="small"
        variant="outlined"
        sx={{
          height: 20,
          fontSize: '0.6875rem',
          color: colors.fg.muted,
          borderColor: colors.border.muted,
          backgroundColor: 'transparent',
          '& .MuiChip-label': { px: 0.75 },
          '& .MuiChip-icon': { color: colors.fg.subtle, ml: 0.5 },
        }}
      />
    </Tooltip>
  );
}

// ── Chain flow chips ──────────────────────────────────────────────────────────

function ChainFlowChips({ names }: { names: string[] }) {
  const theme = useTheme();
  const colors = theme.colors;
  const visible = names.slice(0, 3);
  const extra = names.length - 3;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {visible.map((name) => (
        <Box
          key={name}
          sx={{
            px: 0.75, py: 0.125,
            borderRadius: '4px',
            border: `1px solid ${colors.border.default}`,
            background: colors.canvas.elevated,
            fontSize: '0.6875rem',
            color: colors.fg.muted,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Box>
      ))}
      {extra > 0 && (
        <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle }}>
          +{extra}
        </Typography>
      )}
    </Box>
  );
}

// ── Run detail accordion content ──────────────────────────────────────────────

function RunDetailPanel({ detail, mode, chainLatencyMap }: { detail: RunDetail; mode: 'dark' | 'light'; chainLatencyMap: Record<string, number> }) {
  const theme = useTheme();
  const colors = theme.colors;

  const uniqueModels = getUniqueModels(detail.chain_calls);
  const modelsAreUniform = uniqueModels.length <= 1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {detail.chain_calls.map((call) => {
        const inputFmt = call.input !== null ? tryFormatJson(call.input) : null;
        const outputFmt = call.output !== null ? tryFormatJson(call.output) : null;
        const hasIo = call.input !== null || call.output !== null;
        const p95 = chainLatencyMap[call.chain_name];
        const isSlowCall = call.latency_ms !== null && p95 !== undefined && call.latency_ms > p95;
        return (
          <Box
            key={call.id}
            sx={{
              border: `1px solid ${isSlowCall ? 'rgba(248, 81, 73, 0.3)' : colors.border.muted}`,
              borderRadius: '6px',
              background: colors.canvas.elevated,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                px: 0.75, py: 0.25, borderRadius: '4px',
                border: `1px solid ${colors.border.default}`,
                background: colors.canvas.subtle,
                fontSize: '0.6875rem', fontWeight: 600,
                color: colors.accent.fg, whiteSpace: 'nowrap',
              }}>
                {call.chain_name}
              </Box>
              {!modelsAreUniform && call.model_name !== null && (
                <Chip
                  icon={<SmartToyOutlinedIcon sx={{ fontSize: '0.7rem !important' }} />}
                  label={call.model_name}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    color: colors.fg.muted,
                    borderColor: colors.border.muted,
                    backgroundColor: 'transparent',
                    '& .MuiChip-label': { px: 0.75 },
                    '& .MuiChip-icon': { color: colors.fg.subtle, ml: 0.5 },
                  }}
                />
              )}
              {call.latency_ms !== null && (
                <Tooltip
                  title={isSlowCall ? `Slow — this call took ${call.latency_ms.toLocaleString()}ms (p95: ${p95.toLocaleString()}ms)` : ''}
                  placement="top"
                  disableHoverListener={!isSlowCall}
                >
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 0.75, py: 0.125, borderRadius: '4px',
                    border: `1px solid ${isSlowCall ? 'rgba(248, 81, 73, 0.4)' : colors.border.muted}`,
                    fontSize: '0.6875rem', color: isSlowCall ? '#F85149' : colors.fg.subtle,
                  }}>
                    {call.latency_ms}ms
                    {isSlowCall && <WarningAmberOutlinedIcon sx={{ fontSize: 12, color: '#F85149' }} />}
                  </Box>
                </Tooltip>
              )}
              <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.subtle, ml: 'auto' }}>
                {formatDate(call.called_at)}
              </Typography>
            </Box>

            {/* INPUT / OUTPUT */}
            {hasIo && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {call.input !== null && (
                    <Box sx={{ mb: call.output !== null ? 0 : undefined }}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 0.75, py: 0.25, mb: 0.75, borderRadius: '4px',
                        backgroundColor: 'rgba(56, 139, 253, 0.12)',
                        border: '1px solid rgba(56, 139, 253, 0.3)',
                        color: '#58a6ff', fontSize: '0.625rem', fontWeight: 700,
                        letterSpacing: '0.08em', lineHeight: 1.4, textTransform: 'uppercase',
                      }}>
                        <CallReceivedIcon sx={{ fontSize: '0.7rem' }} />
                        INPUT
                      </Box>
                      {inputFmt?.isJson ? (
                        <Box component="pre" sx={{
                          fontFamily: monoFontFamily, fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
                          borderLeft: '2px solid rgba(56, 139, 253, 0.35)', pl: 1.25,
                        }}
                          dangerouslySetInnerHTML={{ __html: highlightJson(inputFmt.formatted, mode) }}
                        />
                      ) : (
                        <Typography component="pre" sx={{
                          fontFamily: monoFontFamily, fontSize: '0.75rem',
                          color: colors.fg.default, whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', m: 0,
                          borderLeft: '2px solid rgba(56, 139, 253, 0.35)', pl: 1.25,
                        }}>
                          {call.input}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {call.output !== null && (
                    <Box>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 0.75, py: 0.25, mb: 0.75, borderRadius: '4px',
                        backgroundColor: 'rgba(63, 185, 80, 0.12)',
                        border: '1px solid rgba(63, 185, 80, 0.3)',
                        color: '#3fb950', fontSize: '0.625rem', fontWeight: 700,
                        letterSpacing: '0.08em', lineHeight: 1.4, textTransform: 'uppercase',
                      }}>
                        <CallMadeIcon sx={{ fontSize: '0.7rem' }} />
                        OUTPUT
                      </Box>
                      {outputFmt?.isJson ? (
                        <Box component="pre" sx={{
                          fontFamily: monoFontFamily, fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
                          borderLeft: '2px solid rgba(63, 185, 80, 0.35)', pl: 1.25,
                        }}
                          dangerouslySetInnerHTML={{ __html: highlightJson(outputFmt.formatted, mode) }}
                        />
                      ) : (
                        <Typography component="pre" sx={{
                          fontFamily: monoFontFamily, fontSize: '0.75rem',
                          color: colors.fg.default, whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', m: 0,
                          borderLeft: '2px solid rgba(63, 185, 80, 0.35)', pl: 1.25,
                        }}>
                          {call.output}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({
  run,
  expanded,
  detail,
  detailLoading,
  detailError,
  onToggle,
  onOpenStackTrace,
  showViewError,
  mode,
  isSlow,
  chainLatencyMap,
}: {
  run: RunSummary;
  expanded: boolean;
  detail: RunDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  onToggle: () => void;
  onOpenStackTrace: (() => void) | null;
  showViewError: boolean;
  mode: 'dark' | 'light';
  isSlow: boolean;
  chainLatencyMap: Record<string, number>;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const navigate = useNavigate();
  const dotColor = agentDotColor(run.agent_id);

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={onToggle}
      data-run-id={run.id}
      sx={{
        border: `1px solid ${isSlow ? 'rgba(248, 81, 73, 0.45)' : colors.border.muted}`,
        borderRadius: '8px !important',
        background: colors.canvas.subtle,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { borderColor: isSlow ? 'rgba(248, 81, 73, 0.7)' : colors.border.default },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: colors.fg.subtle }} />}
        sx={{ minHeight: 52, px: 2, '& .MuiAccordionSummary-content': { my: 0 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', mr: 1 }}>
          {/* Agent col */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: 140, flexShrink: 0 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
            <Box
              component="span"
              onClick={(e) => { e.stopPropagation(); navigate(`/agents/${run.agent_id}`); }}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.4,
                cursor: 'pointer', color: colors.fg.default, fontWeight: 500,
                fontSize: '0.8125rem', borderRadius: '4px', px: 0.25,
                transition: 'color 0.15s',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                '&:hover': { color: '#8B92E8' },
                '&:hover .agent-link-icon': { opacity: 1 },
              }}
            >
              {run.agent_name}
              <NorthEastIcon
                className="agent-link-icon"
                sx={{ fontSize: '0.65rem', opacity: 0, transition: 'opacity 0.15s', color: '#8B92E8', flexShrink: 0 }}
              />
            </Box>
          </Box>
          {/* Started col */}
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.muted, width: 160, flexShrink: 0 }}>
            {formatDate(run.started_at)}
          </Typography>
          {/* Duration col */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: 72, flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.75rem', color: isSlow ? '#F85149' : colors.fg.subtle }}>
              {formatDuration(run.duration_ms)}
            </Typography>
            {isSlow && <WarningAmberOutlinedIcon sx={{ fontSize: 12, color: '#F85149' }} />}
            {run.status === 'error' && (
              <Box sx={{
                px: 0.75, py: 0.125, borderRadius: '4px',
                background: 'rgba(248, 81, 73, 0.15)',
                border: '1px solid rgba(248, 81, 73, 0.4)',
                fontSize: '0.625rem', fontWeight: 600, color: '#F85149',
                lineHeight: 1.4, letterSpacing: '0.04em',
              }}>
                error
              </Box>
            )}
            {run.status === 'running' && (
              <Box sx={{
                px: 0.75, py: 0.125, borderRadius: '4px',
                background: 'rgba(110, 118, 129, 0.15)',
                border: `1px solid ${colors.border.default}`,
                fontSize: '0.625rem', fontWeight: 600, color: colors.fg.muted,
                lineHeight: 1.4, letterSpacing: '0.04em',
              }}>
                running
              </Box>
            )}
          </Box>
          {/* Calls col */}
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle, width: 48, flexShrink: 0 }}>
            {run.chain_names.length}
          </Typography>
          {/* Chain flow col */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <ChainFlowChips names={run.chain_names} />
          </Box>
          {/* Model badge col */}
          <Box sx={{ width: 160, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <RunModelBadge models={run.model_names} />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 1.5 }}>
          {showViewError && run.status === 'error' && (
            <Button
              size="small"
              endIcon={<ErrorOutlineIcon sx={{ fontSize: '0.7rem !important' }} />}
              onClick={(e) => { e.stopPropagation(); navigate(`/agents/${run.agent_id}/traces?open=${run.id}`); }}
              sx={{
                fontSize: '0.6875rem',
                color: '#F85149',
                px: 1, py: 0.25,
                minHeight: 'unset',
                '&:hover': { backgroundColor: 'rgba(248,81,73,0.08)' },
              }}
            >
              View Error
            </Button>
          )}
          <Button
            size="small"
            endIcon={<NorthEastIcon sx={{ fontSize: '0.7rem !important' }} />}
            onClick={(e) => { e.stopPropagation(); navigate(`/agents/${run.agent_id}`); }}
            sx={{
              fontSize: '0.6875rem',
              color: '#8B92E8',
              px: 1, py: 0.25,
              minHeight: 'unset',
              '&:hover': { backgroundColor: 'rgba(139,146,232,0.08)' },
            }}
          >
            View Agent
          </Button>
        </Box>
        {detailLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {detailError && <Alert severity="error">{detailError}</Alert>}
        {detail && <RunDetailPanel detail={detail} mode={mode} chainLatencyMap={chainLatencyMap} />}
        {run.status === 'error' && onOpenStackTrace && (
          <Box sx={{ mt: detail ? 1.5 : 0 }}>
            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onOpenStackTrace(); }}
              sx={{
                fontSize: '0.6875rem', color: '#F85149', px: 1, py: 0.25, minHeight: 'unset',
                '&:hover': { backgroundColor: 'rgba(248,81,73,0.08)' },
              }}
            >
              View Stack Trace
            </Button>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface TracesPageProps {
  agentId?: string;
  showStackTrace?: boolean;
}

export default function TracesPage({ agentId: fixedAgentId, showStackTrace = false }: TracesPageProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const mode = theme.palette.mode;

  const [searchParams, setSearchParams] = useSearchParams();
  const edgeSource = searchParams.get('source');
  const edgeTarget = searchParams.get('target');
  const statusFilter = searchParams.get('status'); // 'error' | null
  const openRunId = showStackTrace ? searchParams.get('open') : null;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const effectiveAgentId = fixedAgentId ?? selectedAgentId;
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [pendingRuns, setPendingRuns] = useState<RunSummary[]>([]);
  const runsRef = useRef<RunSummary[]>([]);

  const [showSlowOnly, setShowSlowOnly] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, RunDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailError, setDetailError] = useState<Record<string, string>>({});
  const [stackTraceRunId, setStackTraceRunId] = useState<string | null>(null);
  const openHandledRef = useRef(false);

  // Auto-expand accordion when ?open={runId} is present, after runs load
  useEffect(() => {
    if (!openRunId || loading || openHandledRef.current) return;
    const found = runs.find((r) => r.id === openRunId);
    if (!found) return;
    openHandledRef.current = true;
    setExpandedRunId(openRunId);
    if (!details[openRunId] && !detailLoading[openRunId]) {
      setDetailLoading((prev) => ({ ...prev, [openRunId]: true }));
      runsApi.getDetail(openRunId)
        .then((d) => setDetails((prev) => ({ ...prev, [openRunId]: d })))
        .catch((err: Error) => setDetailError((prev) => ({ ...prev, [openRunId]: err.message })))
        .finally(() => setDetailLoading((prev) => ({ ...prev, [openRunId]: false })));
    }
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
    setTimeout(() => {
      document.querySelector(`[data-run-id="${openRunId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, openRunId, runs]);

  // Load agents list only for global view
  useEffect(() => {
    if (fixedAgentId) return;
    agentApi.list().then(setAgents).catch(() => {});
  }, [fixedAgentId]);

  const loadRuns = useCallback(() => {
    setLoading(true);
    setError(null);
    runsApi.list({
      agent_id: effectiveAgentId || undefined,
      started_after: fixedAgentId ? undefined : timeRangeToAfter(timeRange),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      source_chain: edgeSource ?? undefined,
      target_chain: edgeTarget ?? undefined,
      status: statusFilter ?? undefined,
    })
      .then((data) => {
        setRuns(data.items);
        runsRef.current = data.items;
        setTotalPages(Math.ceil(data.total / PAGE_SIZE) || 1);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fixedAgentId, effectiveAgentId, timeRange, page, edgeSource, edgeTarget, statusFilter]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [effectiveAgentId, timeRange, edgeSource, edgeTarget, statusFilter]);

  // Live polling — 15s, silent, first page only
  useEffect(() => {
    const id = setInterval(() => {
      runsApi.list({
        agent_id: effectiveAgentId || undefined,
        started_after: fixedAgentId ? undefined : timeRangeToAfter(timeRange),
        limit: PAGE_SIZE,
        offset: 0,
        source_chain: edgeSource ?? undefined,
        target_chain: edgeTarget ?? undefined,
        status: statusFilter ?? undefined,
      }).then((fresh) => {
        if (page !== 1) return;
        const freshItems = fresh.items;
        if (freshItems.length > 0 && runsRef.current.length > 0 && freshItems[0].id !== runsRef.current[0].id) {
          const knownIds = new Set(runsRef.current.map((r) => r.id));
          const newRuns = freshItems.filter((r) => !knownIds.has(r.id));
          if (newRuns.length > 0) setPendingRuns(newRuns);
        }
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [effectiveAgentId, timeRange, page, edgeSource, edgeTarget, statusFilter]);

  // Computed stats
  const validDurations = runs.filter((r) => r.duration_ms !== null).map((r) => r.duration_ms as number);
  const medianDuration = (() => {
    if (validDurations.length === 0) return null;
    const sorted = [...validDurations].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  })();
  const slowCount = medianDuration !== null
    ? runs.filter((r) => r.duration_ms !== null && r.duration_ms > medianDuration * 2).length
    : 0;
  const errorCount = runs.filter((r) => r.status === 'error').length;

  // Chain-level slow detection: p95 per chain_name fetched from backend
  // agentChainStats: agentId → { chainName → p95_latency_ms }
  const [agentChainStats, setAgentChainStats] = useState<Record<string, Record<string, number>>>({});
  const fetchedAgentsRef = useRef<Set<string>>(new Set());

  // fixedAgentId mode: fetch once on mount
  useEffect(() => {
    if (!fixedAgentId) return;
    chainApi.getChainStatsSummary(fixedAgentId).then((data) => {
      const map: Record<string, number> = {};
      for (const c of data.chains) {
        if (c.p95_latency_ms !== null) map[c.chain_name] = c.p95_latency_ms;
      }
      setAgentChainStats((prev) => ({ ...prev, [fixedAgentId]: map }));
    }).catch(() => {});
  }, [fixedAgentId]);

  // Global mode: lazy fetch per unique agent_id when runs load
  useEffect(() => {
    if (fixedAgentId) return;
    const agentIds = [...new Set(runs.map((r) => r.agent_id))];
    for (const agentId of agentIds) {
      if (fetchedAgentsRef.current.has(agentId)) continue;
      fetchedAgentsRef.current.add(agentId);
      chainApi.getChainStatsSummary(agentId).then((data) => {
        const map: Record<string, number> = {};
        for (const c of data.chains) {
          if (c.p95_latency_ms !== null) map[c.chain_name] = c.p95_latency_ms;
        }
        setAgentChainStats((prev) => ({ ...prev, [agentId]: map }));
      }).catch(() => {});
    }
  }, [fixedAgentId, runs]);

  const handleToggleRun = useCallback((runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      return;
    }
    setExpandedRunId(runId);
    if (details[runId] || detailLoading[runId]) return;
    setDetailLoading((prev) => ({ ...prev, [runId]: true }));
    runsApi.getDetail(runId)
      .then((d) => setDetails((prev) => ({ ...prev, [runId]: d })))
      .catch((err: Error) => setDetailError((prev) => ({ ...prev, [runId]: err.message })))
      .finally(() => setDetailLoading((prev) => ({ ...prev, [runId]: false })));
  }, [expandedRunId, details, detailLoading]);

  return (
    <Box>
      {/* Header — hidden when used as agent tab */}
      {!fixedAgentId && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <TimelineOutlinedIcon sx={{ fontSize: 20, color: colors.fg.subtle }} />
          <Typography variant="h2">Traces</Typography>
        </Box>
      )}

      {/* Filter bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        {!fixedAgentId && (
          <Select
            size="small"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            displayEmpty
            sx={{ minWidth: 180, fontSize: '0.8125rem' }}
          >
            <MenuItem value="">All Agents</MenuItem>
            {agents.map((a) => (
              <MenuItem key={a.id} value={a.id} sx={{ fontSize: '0.8125rem' }}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        )}

        {!fixedAgentId && (
          <ToggleButtonGroup
            size="small"
            value={timeRange}
            exclusive
            onChange={(_, v) => { if (v) setTimeRange(v as TimeRange); }}
          >
            {(['1h', '24h', '7d'] as TimeRange[]).map((r) => (
              <ToggleButton key={r} value={r} sx={{ fontSize: '0.75rem', px: 1.5, textTransform: 'none' }}>
                Last {r}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Active filter chips */}
      {(edgeSource && edgeTarget) || statusFilter ? (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {edgeSource && edgeTarget && (
            <Chip
              label={`${edgeSource} → ${edgeTarget}`}
              onDelete={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('source');
                next.delete('target');
                setSearchParams(next);
              }}
              size="small"
              sx={{
                fontSize: '0.75rem',
                background: 'rgba(94, 106, 210, 0.15)',
                border: '1px solid rgba(94, 106, 210, 0.4)',
                color: '#8B92E8',
                '& .MuiChip-deleteIcon': { color: '#8B92E8', '&:hover': { color: colors.fg.default } },
              }}
            />
          )}
          {statusFilter === 'error' && (
            <Chip
              label="error only"
              onDelete={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('status');
                setSearchParams(next);
              }}
              size="small"
              sx={{
                fontSize: '0.75rem',
                background: 'rgba(248, 81, 73, 0.15)',
                border: '1px solid rgba(248, 81, 73, 0.4)',
                color: '#F85149',
                '& .MuiChip-deleteIcon': { color: '#F85149', '&:hover': { color: colors.fg.default } },
              }}
            />
          )}
        </Box>
      ) : null}

      {/* Summary banner */}
      {!loading && !error && runs.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, px: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.muted }}>
            {runs.length} runs
          </Typography>
          {medianDuration !== null && (
            <>
              <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>·</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: colors.fg.muted }}>
                median {formatDuration(Math.round(medianDuration))}
              </Typography>
            </>
          )}
          {slowCount > 0 && (
            <>
              <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>·</Typography>
              <Box
                onClick={() => setShowSlowOnly((v) => !v)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  cursor: 'pointer',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '4px',
                  background: showSlowOnly ? 'rgba(248, 81, 73, 0.2)' : 'transparent',
                  border: `1px solid ${showSlowOnly ? 'rgba(248, 81, 73, 0.5)' : 'transparent'}`,
                  transition: 'all 0.15s',
                  '&:hover': { background: 'rgba(248, 81, 73, 0.15)' },
                }}
              >
                <WarningAmberOutlinedIcon sx={{ fontSize: 12, color: '#F85149' }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#F85149' }}>
                  {slowCount} slow
                </Typography>
              </Box>
            </>
          )}
          {errorCount > 0 && (
            <>
              <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>·</Typography>
              <Box
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  if (statusFilter === 'error') {
                    next.delete('status');
                  } else {
                    next.set('status', 'error');
                  }
                  setSearchParams(next);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  cursor: 'pointer',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '4px',
                  background: statusFilter === 'error' ? 'rgba(248, 81, 73, 0.2)' : 'transparent',
                  border: `1px solid ${statusFilter === 'error' ? 'rgba(248, 81, 73, 0.5)' : 'transparent'}`,
                  transition: 'all 0.15s',
                  '&:hover': { background: 'rgba(248, 81, 73, 0.15)' },
                }}
              >
                <WarningAmberOutlinedIcon sx={{ fontSize: 12, color: '#F85149' }} />
                <Typography sx={{ fontSize: '0.75rem', color: '#F85149' }}>
                  {errorCount} Error
                </Typography>
              </Box>
            </>
          )}
          {showSlowOnly && (
            <Typography
              onClick={() => setShowSlowOnly(false)}
              sx={{ fontSize: '0.6875rem', color: colors.fg.subtle, cursor: 'pointer', '&:hover': { color: colors.fg.muted } }}
            >
              Showing slow only · ✕
            </Typography>
          )}
        </Box>
      )}

      {/* Table header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 2,
        px: 2, pb: 0.75, mb: 0.5,
        borderBottom: `1px solid ${colors.border.muted}`,
      }}>
        {[
          { label: 'Agent', width: 140 },
          { label: 'Started', width: 160 },
          { label: 'Duration', width: 72 },
          { label: 'Calls', width: 48 },
          { label: 'Chain Flow', flex: 1 },
          { label: 'Model', width: 160 },
        ].map(({ label, width, flex }) => (
          <Typography
            key={label}
            sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.fg.subtle,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              width: width ?? undefined, flex: flex ?? undefined, flexShrink: 0 }}
          >
            {label}
          </Typography>
        ))}
        {/* spacer for expand icon */}
        <Box sx={{ width: 28, flexShrink: 0 }} />
      </Box>

      {/* Runs list */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {!loading && !error && runs.length === 0 && (
        <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <TimelineOutlinedIcon sx={{ fontSize: 40, color: colors.fg.subtle }} />
          <Typography variant="body1" sx={{ color: colors.fg.muted }}>No runs in this time range.</Typography>
        </Box>
      )}
      {!loading && !error && runs.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
          {/* Pending runs banner */}
          {pendingRuns.length > 0 && (
            <Box
              onClick={() => {
                const merged = [...pendingRuns, ...runs];
                setRuns(merged);
                runsRef.current = merged;
                setPendingRuns([]);
              }}
              sx={{
                px: 2, py: 1,
                borderRadius: '8px',
                border: `1px solid ${colors.accent.muted}`,
                background: colors.accent.subtle,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                '&:hover': { background: colors.accent.muted },
                transition: 'background 0.1s ease',
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: colors.accent.fg, fontWeight: 500 }}>
                ↑ {pendingRuns.length} new {pendingRuns.length === 1 ? 'run' : 'runs'} — click to load
              </Typography>
            </Box>
          )}
          {runs
            .filter((run) => !showSlowOnly || (medianDuration !== null && run.duration_ms !== null && run.duration_ms > medianDuration * 2))
            .map((run) => (
              <RunRow
                key={run.id}
                run={run}
                expanded={expandedRunId === run.id}
                detail={details[run.id] ?? null}
                detailLoading={detailLoading[run.id] ?? false}
                detailError={detailError[run.id] ?? null}
                onToggle={() => handleToggleRun(run.id)}
                onOpenStackTrace={showStackTrace ? () => setStackTraceRunId(run.id) : null}
                showViewError={!showStackTrace}
                mode={mode}
                isSlow={medianDuration !== null && run.duration_ms !== null && run.duration_ms > medianDuration * 2}
                chainLatencyMap={agentChainStats[run.agent_id] ?? {}}
              />
            ))}
        </Box>
      )}

      {/* Stack Trace Modal */}
      {stackTraceRunId && (
        <StackTraceModal
          open={!!stackTraceRunId}
          onClose={() => setStackTraceRunId(null)}
          runId={stackTraceRunId}
          agentName={runs.find((r) => r.id === stackTraceRunId)?.agent_name}
        />
      )}

      {/* Pagination */}
      {showSlowOnly ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>
            Filtered view — pagination disabled
          </Typography>
        </Box>
      ) : totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
}
