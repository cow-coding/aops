import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { diffLines } from 'diff';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Pagination,
  Switch,
  Tab,
  Tabs,
  TextField,

  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart, Bar, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';
import type { Agent } from '../types/agent';
import type { Chain, ChainUpdateRequest, ChainVersion, ChainStats, ChainLog, ChainTimeseries } from '../types/chain';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { monoFontFamily } from '../theme';
import TimeRangeSelector, { granularityFromParams } from '../components/TimeRangeSelector';
import type { TimeseriesParams } from '../components/TimeRangeSelector';
import { formatDateTime, formatBucketLabel } from '../utils/date';

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
  dark: {
    key:         '#d2a8ff',
    string:      '#a5d6ff',
    number:      '#79c0ff',
    boolean:     '#ff7b72',
    null:        '#8b949e',
    punctuation: '#656d76',
  },
  light: {
    key:         '#953800',
    string:      '#0a3069',
    number:      '#0550ae',
    boolean:     '#cf222e',
    null:        '#6e7781',
    punctuation: '#57606a',
  },
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


// ── Chart color constants ─────────────────────────────────────────────────────
const CHART_AMBER = '#F59E0B';
const CHART_TEAL = '#2DD4BF';

function MarkdownRenderer({ content }: { content: string }) {
  const theme = useTheme();
  const colors = theme.colors;

  const markdownSx = {
    color: colors.fg.default,
    fontSize: '0.8125rem',
    lineHeight: 1.7,
    '& h1, & h2, & h3, & h4, & h5, & h6': {
      color: colors.fg.default,
      fontWeight: 600,
      marginTop: '1.5em',
      marginBottom: '0.5em',
      lineHeight: 1.3,
    },
    '& h1': { fontSize: '1.5rem' },
    '& h2': { fontSize: '1.25rem' },
    '& h3': { fontSize: '1.1rem' },
    '& p': { margin: '0.75em 0' },
    '& a': { color: colors.accent.fg, textDecoration: 'underline' },
    '& code': {
      fontFamily: monoFontFamily,
      fontSize: '0.8125rem',
      background: colors.canvas.elevated,
      border: `1px solid ${colors.border.default}`,
      borderRadius: '4px',
      padding: '2px 5px',
      color: colors.terminal.blue,
    },
    '& pre': {
      fontFamily: monoFontFamily,
      fontSize: '0.8125rem',
      background: colors.canvas.inset,
      borderLeft: `2px solid ${colors.accent.emphasis}`,
      borderRadius: '4px',
      padding: '12px 16px',
      overflowX: 'auto',
      lineHeight: 1.6,
      '& code': {
        background: 'none',
        border: 'none',
        padding: 0,
        borderRadius: 0,
        color: colors.fg.default,
      },
    },
    '& blockquote': {
      margin: '0.75em 0',
      paddingLeft: '1em',
      borderLeft: `2px solid ${colors.terminal.purple}`,
      color: colors.fg.muted,
    },
    '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
    '& li': { margin: '0.25em 0' },
    '& table': {
      borderCollapse: 'collapse',
      width: '100%',
      '& th, & td': {
        border: `1px solid ${colors.border.default}`,
        padding: '6px 12px',
        textAlign: 'left',
      },
      '& th': { background: colors.canvas.subtle, fontWeight: 600 },
      '& tr:nth-of-type(even)': { background: colors.canvas.elevated },
    },
    '& hr': { border: 'none', borderTop: `1px solid ${colors.border.muted}`, margin: '1.5em 0' },
    '& img': { maxWidth: '100%' },
  };

  return (
    <Box sx={markdownSx}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const theme = useTheme();
  const colors = theme.colors;
  const changes = diffLines(oldText, newText);

  return (
    <Box
      sx={{
        fontFamily: monoFontFamily,
        fontSize: '0.8125rem',
        lineHeight: 1.6,
        background: colors.canvas.inset,
        border: `1px solid ${colors.border.muted}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {changes.map((change, idx) => {
        const filteredLines = change.value.endsWith('\n')
          ? change.value.split('\n').slice(0, -1)
          : change.value.split('\n');

        return filteredLines.map((line, lineIdx) => {
          const isAdded = change.added === true;
          const isRemoved = change.removed === true;
          return (
            <Box
              key={`${idx}-${lineIdx}`}
              sx={{
                display: 'flex',
                backgroundColor: isAdded
                  ? `${colors.success.fg}14`
                  : isRemoved
                  ? `${colors.danger.fg}14`
                  : 'transparent',
                borderLeft: isAdded
                  ? `3px solid ${colors.terminal.green}`
                  : isRemoved
                  ? `3px solid ${colors.danger.fg}`
                  : '3px solid transparent',
              }}
            >
              <Box
                sx={{
                  width: 20,
                  flexShrink: 0,
                  textAlign: 'center',
                  color: isAdded
                    ? colors.terminal.green
                    : isRemoved
                    ? colors.danger.fg
                    : 'transparent',
                  userSelect: 'none',
                  paddingLeft: '4px',
                }}
              >
                {isAdded ? '+' : isRemoved ? '-' : ' '}
              </Box>
              <Box
                sx={{
                  flex: 1,
                  paddingX: 1,
                  color: isAdded
                    ? colors.terminal.green
                    : isRemoved
                    ? colors.danger.fg
                    : colors.fg.subtle,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
                {line || ' '}
              </Box>
            </Box>
          );
        });
      })}
    </Box>
  );
}

type VersionAction = 'code' | 'diff' | null;

function VersionRow({
  version,
  prevVersion,
  isLatest,
  onRollback,
}: {
  version: ChainVersion;
  prevVersion: ChainVersion | null;
  isLatest: boolean;
  onRollback: (version: ChainVersion) => void;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const [action, setAction] = useState<VersionAction>(null);

  const commitTitle = version.message ? version.message.split('\n')[0] : `Version ${version.version_number}`;

  const toggleAction = (next: VersionAction) => {
    setAction((prev) => (prev === next ? null : next));
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          py: 1.5,
          px: 1,
        }}
      >
        {/* Commit title */}
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: colors.fg.default,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {commitTitle}
        </Typography>

        {/* Version badge — terminal green */}
        <Box
          component="span"
          sx={{
            fontFamily: monoFontFamily,
            fontSize: '0.75rem',
            color: colors.terminal.green,
            background: colors.canvas.inset,
            border: `1px solid ${colors.border.muted}`,
            borderRadius: '4px',
            padding: '1px 6px',
            flexShrink: 0,
          }}
        >
          v{version.version_number}
        </Box>

        <Typography
          sx={{
            fontFamily: monoFontFamily,
            fontSize: '0.6875rem',
            color: colors.fg.subtle,
            flexShrink: 0,
          }}
        >
          {formatDateTime(version.created_at)}
        </Typography>

        {isLatest && (
          <Box
            component="span"
            sx={{
              fontSize: '0.625rem',
              fontWeight: 500,
              color: colors.success.fg,
              background: colors.canvas.subtle,
              border: `1px solid ${colors.success.fg}`,
              borderRadius: '4px',
              padding: '1px 6px',
              flexShrink: 0,
            }}
          >
            current
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Button
            size="small"
            variant={action === 'code' ? 'contained' : 'outlined'}
            startIcon={<CodeOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => toggleAction('code')}
            sx={{ fontSize: '0.75rem', minHeight: 24, padding: '2px 10px' }}
          >
            View Prompt
          </Button>
          <Button
            size="small"
            variant={action === 'diff' ? 'contained' : 'outlined'}
            startIcon={<DifferenceOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => toggleAction('diff')}
            sx={{ fontSize: '0.75rem', minHeight: 24, padding: '2px 10px' }}
          >
            View Diff
          </Button>
          {!isLatest && (
            <Tooltip title="Rollback" placement="top">
              <IconButton
                size="small"
                onClick={() => onRollback(version)}
                sx={{
                  color: colors.accent.fg,
                  '&:hover': { backgroundColor: colors.accent.subtle },
                }}
              >
                <RestoreOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {action === 'code' && (
        <Box sx={{ ml: 2, mb: 2, mt: 0.5 }}>
          {version.persona && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1.5,
                mb: 1.5,
                pb: 1.5,
                borderBottom: `1px solid ${colors.border.muted}`,
              }}
            >
              <Typography
                component="span"
                sx={{ color: colors.fg.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                persona
              </Typography>
              <Typography
                component="span"
                sx={{ color: colors.fg.default, fontSize: '0.875rem' }}
              >
                {version.persona}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              background: colors.canvas.inset,
              border: `1px solid ${colors.border.muted}`,
              borderRadius: '6px',
              padding: '16px',
              minHeight: 60,
            }}
          >
            <MarkdownRenderer content={version.content} />
          </Box>
        </Box>
      )}

      {action === 'diff' && (
        <Box sx={{ ml: 2, mb: 2, mt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontSize: '0.75rem', color: colors.fg.muted, fontFamily: monoFontFamily }}>
            {prevVersion
              ? `v${prevVersion.version_number} → v${version.version_number}`
              : `v${version.version_number} (initial version)`}
          </Typography>
          {prevVersion && prevVersion.persona !== version.persona && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                background: colors.canvas.subtle,
                border: `1px solid ${colors.border.muted}`,
                borderRadius: '6px',
                padding: '8px 12px',
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontWeight: 500, mb: 0.5 }}>
                Persona changed:
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: colors.danger.fg, textDecoration: 'line-through', wordBreak: 'break-word' }}>
                - {prevVersion.persona ?? '(none)'}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: colors.success.fg, wordBreak: 'break-word' }}>
                + {version.persona ?? '(none)'}
              </Typography>
            </Box>
          )}
          {!prevVersion && version.persona && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                background: colors.canvas.subtle,
                border: `1px solid ${colors.border.muted}`,
                borderRadius: '6px',
                padding: '8px 12px',
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, fontWeight: 500, mb: 0.5 }}>
                Persona:
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: colors.success.fg, wordBreak: 'break-word' }}>
                {version.persona}
              </Typography>
            </Box>
          )}
          <DiffViewer
            oldText={prevVersion ? prevVersion.content : ''}
            newText={version.content}
          />
        </Box>
      )}
    </Box>
  );
}

function formatXAxisTick(ts: string, granularity: import('../components/TimeRangeSelector').Granularity): string {
  const d = new Date(ts);
  if (granularity === '5m' || granularity === '1h') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${d.getMonth() + 1}/${d.getDate()}`;
}


function LatencyTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number | null }[]; label?: string }) {
  const theme = useTheme();
  const colors = theme.colors;
  if (!active || !payload?.length) return null;
  const avg = payload.find((p) => p.dataKey === 'avg_latency_ms')?.value ?? null;
  const p95 = payload.find((p) => p.dataKey === 'p95_latency_ms')?.value ?? null;
  const spread = avg != null && p95 != null ? p95 - avg : null;

  return (
    <Box sx={{ background: colors.canvas.overlay, border: `1px solid ${colors.border.default}`, borderRadius: '6px', p: '8px 12px', fontSize: 12, minWidth: 140 }}>
      <Typography sx={{ fontSize: 11, color: colors.fg.subtle, mb: 0.75 }}>
        {label ? formatBucketLabel(new Date(label)) : ''}
      </Typography>
      {avg != null ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 2, background: CHART_TEAL, borderRadius: 1 }} />
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.subtle }}>Avg</Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12, color: colors.fg.default, fontWeight: 600 }}>{Math.round(avg)}ms</Typography>
        </Box>
      ) : null}
      {p95 != null ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: spread != null ? 0.5 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 2, background: CHART_AMBER, borderRadius: 1 }} />
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.subtle }}>p95</Typography>
          </Box>
          <Typography component="span" sx={{ fontSize: 12, color: colors.fg.default, fontWeight: 600 }}>{Math.round(p95)}ms</Typography>
        </Box>
      ) : null}
      {spread != null && (
        <Box sx={{ borderTop: `1px solid ${colors.border.muted}`, pt: 0.5, mt: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography component="span" sx={{ fontSize: 12, color: colors.fg.subtle }}>Spread</Typography>
            <Typography component="span" sx={{ fontSize: 12, color: spread > 100 ? colors.danger.fg : colors.fg.subtle }}>{Math.round(spread)}ms</Typography>
          </Box>
        </Box>
      )}
      {avg == null && (
        <Typography sx={{ fontSize: 11, color: colors.fg.subtle, fontStyle: 'italic' }}>No data</Typography>
      )}
    </Box>
  );
}

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
        px: '6px',
        py: '2px',
        borderRadius: '4px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color,
        backgroundColor: bg,
        ml: 1,
        lineHeight: 1.4,
      }}
    >
      {arrow} {Math.abs(pct).toFixed(1)}%
    </Box>
  );
}

export default function ChainDetailPage() {
  const { id: agentId, chainId, tab: tabParam } = useParams<{ id: string; chainId: string; tab?: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const TAB_SLUGS = ['prompt', 'history', 'stats', 'logs', 'settings'] as const;
  type TabSlug = typeof TAB_SLUGS[number];
  const activeTabSlug: TabSlug = (TAB_SLUGS.includes(tabParam as TabSlug) ? tabParam : 'prompt') as TabSlug;
  const activeTab = TAB_SLUGS.indexOf(activeTabSlug);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [versions, setVersions] = useState<ChainVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChainUpdateRequest>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitTitle, setCommitTitle] = useState('');
  const [commitDescription, setCommitDescription] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const [rollbackVersion, setRollbackVersion] = useState<ChainVersion | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [descSaving, setDescSaving] = useState(false);
  const [descError, setDescError] = useState<string | null>(null);

  const [showInFlowSaving, setShowInFlowSaving] = useState(false);

  const [stats, setStats] = useState<ChainStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [timeseriesParams, setTimeseriesParams] = useState<TimeseriesParams>({ range: '1h' });
  const timeseriesParamsRef = useRef<TimeseriesParams>(timeseriesParams);
  const [timeseries, setTimeseries] = useState<ChainTimeseries | null>(null);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);

  const [logs, setLogs] = useState<ChainLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [pendingLogs, setPendingLogs] = useState<ChainLog[]>([]);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const logsRef = useRef<ChainLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const LOGS_PAGE_SIZE = 30;

  const loadStats = useCallback(() => {
    if (!agentId || !chainId) return;
    setStatsLoading(true);
    setStatsError(null);
    chainApi.getStats(agentId, chainId)
      .then(setStats)
      .catch((err: Error) => setStatsError(err.message))
      .finally(() => { setStatsLoading(false); setStatsLoaded(true); });
  }, [agentId, chainId]);

  const loadTimeseries = useCallback((params: TimeseriesParams) => {
    if (!agentId || !chainId) return;
    setTimeseriesParams(params);
    timeseriesParamsRef.current = params;
    setStatsLoading(true);
    setStatsError(null);
    setTimeseriesLoading(true);
    setTimeseriesError(null);
    chainApi.getStats(agentId, chainId, params)
      .then(setStats)
      .catch((err: Error) => setStatsError(err.message))
      .finally(() => { setStatsLoading(false); setStatsLoaded(true); });
    chainApi.getTimeseries(agentId, chainId, params)
      .then(setTimeseries)
      .catch((err: Error) => setTimeseriesError(err.message))
      .finally(() => setTimeseriesLoading(false));
  }, [agentId, chainId]);

  const loadLogs = useCallback((page = 1) => {
    if (!agentId || !chainId) return;
    setLogsLoading(true);
    setLogsError(null);
    chainApi.getLogs(agentId, chainId, { limit: LOGS_PAGE_SIZE, offset: (page - 1) * LOGS_PAGE_SIZE })
      .then((data) => {
        setLogs(data.items);
        logsRef.current = data.items;
        setLogsTotalPages(Math.ceil(data.total / LOGS_PAGE_SIZE) || 1);
      })
      .catch((err: Error) => setLogsError(err.message))
      .finally(() => { setLogsLoading(false); setLogsLoaded(true); });
  }, [agentId, chainId, LOGS_PAGE_SIZE]);

  // Live polling while Logs tab is active
  useEffect(() => {
    if (activeTab !== 3 || !agentId || !chainId) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await chainApi.getLogs(agentId, chainId, { limit: 30 });
        const freshItems = fresh.items;
        const currentTopId = logsRef.current[0]?.id;
        const freshTopId = freshItems[0]?.id;
        if (freshTopId && freshTopId !== currentTopId) {
          const newCount = freshItems.findIndex((l) => l.id === currentTopId);
          const newLogs = newCount === -1 ? freshItems : freshItems.slice(0, newCount);
          setPendingLogs(newLogs);
        }
      } catch {
        // silent — don't disrupt UX on polling error
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, agentId, chainId]);

  useEffect(() => {
    if (logsLoaded) loadLogs(logsPage);
  }, [logsPage]);

  const loadData = () => {
    if (!agentId || !chainId) return;
    return Promise.all([
      agentApi.getById(agentId),
      chainApi.getById(agentId, chainId),
      chainApi.getVersions(agentId, chainId),
    ])
      .then(([ag, ch, vers]) => {
        setAgent(ag);
        setChain(ch);
        setVersions(vers.sort((a, b) => b.version_number - a.version_number));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [agentId, chainId]);

  const handleEdit = () => {
    if (!chain) return;
    setForm({ persona: chain.persona, content: chain.content });
    setEditing(true);
    setSaveError(null);
  };

  const handleDiscard = () => {
    setEditing(false);
    setForm({});
    setSaveError(null);
  };

  const handleOpenCommitDialog = () => {
    setCommitTitle('Update persona instructions');
    setCommitDescription('');
    setCommitDialogOpen(true);
  };

  const handleCommit = async () => {
    if (!agentId || !chainId) return;
    setSaving(true);
    setSaveError(null);
    setCommitDialogOpen(false);

    const message = commitDescription.trim()
      ? `${commitTitle.trim()}\n\n${commitDescription.trim()}`
      : commitTitle.trim();

    try {
      const cleanedForm = { ...form };
      if (cleanedForm.persona != null && !cleanedForm.persona.trim()) {
        cleanedForm.persona = null;
      }
      const updated = await chainApi.update(agentId, chainId, { ...cleanedForm, message });
      setChain(updated);
      setEditing(false);
      setForm({});
      const vers = await chainApi.getVersions(agentId, chainId);
      setVersions(vers.sort((a, b) => b.version_number - a.version_number));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChain = async () => {
    if (!agentId || !chainId) return;
    setDeleting(true);
    try {
      await chainApi.delete(agentId, chainId);
      navigate(`/agents/${agentId}/chains`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chain');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleRollback = async () => {
    if (!agentId || !chainId || !rollbackVersion) return;
    setRollingBack(true);
    setRollbackError(null);
    try {
      const updated = await chainApi.rollback(agentId, chainId, rollbackVersion.id);
      setChain(updated);
      const vers = await chainApi.getVersions(agentId, chainId);
      setVersions(vers.sort((a, b) => b.version_number - a.version_number));
      setRollbackVersion(null);
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : 'Failed to rollback');
    } finally {
      setRollingBack(false);
    }
  };

  function handleStartEditDesc() {
    if (!chain) return;
    setDescValue(chain.description ?? '');
    setDescError(null);
    setEditingDesc(true);
  }

  function handleCancelDesc() {
    setEditingDesc(false);
    setDescError(null);
  }

  async function handleSaveDesc() {
    if (!agentId || !chainId) return;
    setDescSaving(true);
    setDescError(null);
    try {
      const updated = await chainApi.update(agentId, chainId, { description: descValue.trim() || undefined });
      setChain(updated);
      setEditingDesc(false);
    } catch (err) {
      setDescError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setDescSaving(false);
    }
  }

  function handleDescKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') handleCancelDesc();
    if (e.key === 'Enter' && e.ctrlKey) handleSaveDesc();
  }

  async function handleToggleShowInFlow() {
    if (!agentId || !chainId || !chain) return;
    const newValue = !chain.show_in_flow;
    setChain((prev) => (prev ? { ...prev, show_in_flow: newValue } : prev));
    setShowInFlowSaving(true);
    try {
      const updated = await chainApi.update(agentId, chainId, { show_in_flow: newValue });
      setChain(updated);
    } catch {
      setChain((prev) => (prev ? { ...prev, show_in_flow: !newValue } : prev));
    } finally {
      setShowInFlowSaving(false);
    }
  }

  const isFormValid = (form.content ?? '').trim() !== '';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !chain) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error ?? 'Chain not found'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/agents/${agentId}/chains`)}>
          Back to Agent
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Back navigation */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/agents/${agentId}/chains`)}
        sx={{ mb: 2, color: colors.fg.muted, '&:hover': { color: colors.fg.default } }}
      >
        Back to {agent?.name ?? 'Agent'}
      </Button>

      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AccountTreeOutlinedIcon sx={{ fontSize: 32, color: colors.fg.muted }} />
        <Typography variant="h2" sx={{ flex: 1 }}>
          {chain.name}
        </Typography>
        <Button
          size="small"
          variant="text"
          startIcon={<DeleteOutlinedIcon />}
          onClick={() => setDeleteDialogOpen(true)}
          sx={{
            color: colors.danger.fg,
            ml: 'auto',
            '&:hover': { backgroundColor: colors.danger.subtle },
          }}
        >
          Delete
        </Button>
      </Box>

      {editingDesc ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onKeyDown={handleDescKeyDown}
            autoFocus
            placeholder="Add a description..."
            size="small"
          />
          {descError && (
            <Typography sx={{ fontSize: '0.75rem', color: colors.danger.fg }}>
              {descError}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="contained" onClick={handleSaveDesc} disabled={descSaving}>
              {descSaving ? <CircularProgress size={12} color="inherit" /> : 'Save'}
            </Button>
            <Button size="small" variant="outlined" onClick={handleCancelDesc} disabled={descSaving}>
              Cancel
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 2 }}>
          <Typography
            variant="body1"
            sx={{ color: chain.description ? colors.fg.muted : colors.fg.subtle, cursor: 'text' }}
            onClick={handleStartEditDesc}
          >
            {chain.description ?? 'No description'}
          </Typography>
          <IconButton
            size="small"
            onClick={handleStartEditDesc}
            sx={{ p: 0.25, color: colors.fg.subtle, flexShrink: 0 }}
          >
            <EditOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      )}

      {/* Tabs + Edit button row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border.muted}`,
          mb: 3,
        }}
      >
        <Tabs value={activeTab} onChange={(_, v: number) => {
          const slug = TAB_SLUGS[v];
          navigate(`/agents/${agentId}/chains/${chainId}/${slug}`);
          setEditing(false);
          setForm({});
          setSaveError(null);
          if (v === 2) loadTimeseries(timeseriesParamsRef.current);
          if (v === 3 && !logsLoaded && !logsLoading) loadLogs();
        }}>
          <Tab label="Prompt" />
          <Tab label="History" />
          <Tab label="Stats" />
          <Tab label="Logs" />
          <Tab label="Settings" />
        </Tabs>
        {activeTab === 0 && !editing && (
          <Box sx={{ ml: 'auto', pb: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          </Box>
        )}
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}

      {/* ── Prompt tab ── */}
      {activeTab === 0 && (
        <Box>
          {editing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography
                  component="label"
                  variant="body1"
                  sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                >
                  Persona{' '}
                  <Typography component="span" variant="caption" sx={{ color: colors.fg.muted }}>
                    (optional)
                  </Typography>
                </Typography>
                <TextField
                  fullWidth
                  placeholder="e.g. Senior Engineer, Product Manager, QA Tester..."
                  value={form.persona ?? chain.persona ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, persona: e.target.value }))}
                  helperText="Defines the role mindset for this chain. Leave blank to omit."
                />
              </Box>

              <Box>
                <Typography
                  component="label"
                  variant="body1"
                  sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                >
                  Content <span style={{ color: colors.danger.fg }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  placeholder="// Enter prompt content..."
                  value={form.content ?? chain.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  inputProps={{
                    style: {
                      fontFamily: monoFontFamily,
                      fontSize: '0.8125rem',
                      lineHeight: 1.7,
                      letterSpacing: '-0.01em',
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: colors.canvas.inset,
                    },
                    '& .MuiInputBase-inputMultiline': {
                      resize: 'vertical',
                      minHeight: '200px',
                    },
                  }}
                />
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant="outlined" onClick={handleDiscard} disabled={saving}>
                  Discard
                </Button>
                <Tooltip
                  title={!isFormValid ? 'Required: content' : ''}
                  placement="top"
                  arrow
                >
                  <span>
                    <Button
                      variant="contained"
                      onClick={handleOpenCommitDialog}
                      disabled={!isFormValid || saving}
                    >
                      {saving ? (
                        <>
                          <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                          Saving...
                        </>
                      ) : (
                        'Commit changes...'
                      )}
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          ) : (
            <>
              {chain.persona && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1.5,
                    mb: 1.5,
                    pb: 1.5,
                    borderBottom: `1px solid ${colors.border.muted}`,
                  }}
                >
                  <Typography
                    component="span"
                    sx={{ color: colors.fg.muted, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                  >
                    persona
                  </Typography>
                  <Typography
                    component="span"
                    sx={{ color: colors.fg.default, fontSize: '0.875rem' }}
                  >
                    {chain.persona}
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  background: colors.canvas.inset,
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '6px',
                  padding: '16px',
                  minHeight: 120,
                }}
              >
                <MarkdownRenderer content={chain.content} />
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ── History tab ── */}
      {activeTab === 1 && (
        <Box>
          {versions.length === 0 ? (
            <Typography
              variant="body1"
              sx={{ color: colors.fg.subtle, py: 3, textAlign: 'center' }}
            >
              No versions yet. Save changes to create a version.
            </Typography>
          ) : (
            <Box>
              {versions.map((ver, idx) => {
                const prevVer = versions[idx + 1] ?? null;
                const isLatest = idx === 0;
                return (
                  <Box key={ver.id}>
                    <VersionRow version={ver} prevVersion={prevVer} isLatest={isLatest} onRollback={setRollbackVersion} />
                    <Divider />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ── Stats tab ── */}
      {activeTab === 2 && (
        <Box>
          {/* ── Time Range Selector — always mounted to preserve state ── */}
          <Box sx={{ mb: 2 }}>
            <TimeRangeSelector onChange={loadTimeseries} loading={timeseriesLoading} />
          </Box>

          {statsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {statsError && <Alert severity="error" sx={{ mb: 2 }}>{statsError}</Alert>}
          {timeseriesError && <Alert severity="error" sx={{ mb: 2 }}>{timeseriesError}</Alert>}

          {!statsLoading && !statsError && stats && (
            <>
              {/* ── Summary Cards ── */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
                {([
                  {
                    label: 'Total Calls',
                    value: stats.total_calls.toLocaleString(),
                    trendPct: timeseries?.trend.calls_pct ?? null,
                    invert: false,
                  },
                  {
                    label: 'Runs Appeared In',
                    value: stats.runs_appeared_in.toLocaleString(),
                    trendPct: timeseries?.trend.calls_pct ?? null,
                    invert: false,
                  },
                  {
                    label: 'Avg Latency',
                    value: stats.avg_latency_ms !== null ? `${Math.round(stats.avg_latency_ms)}ms` : '—',
                    trendPct: timeseries?.trend.avg_latency_pct ?? null,
                    invert: true,
                    tooltip: 'Average response time across all runs in the selected period.',
                  },
                  {
                    label: 'p95 Latency',
                    value: stats.p95_latency_ms !== null ? `${Math.round(stats.p95_latency_ms)}ms` : '—',
                    trendPct: timeseries?.trend.p95_latency_pct ?? null,
                    invert: true,
                    tooltip: '95th percentile latency — 95% of runs completed faster than this value. A high p95 indicates occasional slow responses even if the average looks healthy.',
                  },
                  {
                    label: 'Last Called',
                    value: stats.last_called_at ? formatDateTime(stats.last_called_at) : '—',
                    trendPct: null,
                    invert: false,
                  },
                ] as { label: string; value: string; trendPct: number | null; invert: boolean; tooltip?: string }[]).map(({ label, value, trendPct, invert, tooltip }) => (
                  <Box
                    key={label}
                    sx={{
                      border: `1px solid ${colors.border.muted}`,
                      borderRadius: '8px',
                      px: 2,
                      py: 1.75,
                      background: colors.canvas.subtle,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.6875rem', color: colors.fg.muted }}>
                        {label}
                      </Typography>
                      {tooltip && (
                        <Tooltip title={tooltip} arrow>
                          <InfoOutlinedIcon sx={{ fontSize: 13, color: colors.fg.subtle, ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                        </Tooltip>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: colors.fg.default }}>
                        {value}
                      </Typography>
                      <TrendBadge pct={trendPct} invert={invert} />
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* ── Charts ── */}
              {timeseries && timeseries.buckets.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Call Count Bar Chart */}
                  <Box
                    sx={{
                      border: `1px solid ${colors.border.muted}`,
                      borderRadius: '8px',
                      p: 2,
                      background: colors.canvas.subtle,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.muted, mb: 1.5 }}>
                      Call Count
                    </Typography>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={timeseries.buckets} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid vertical={false} stroke={colors.border.muted} />
                        <XAxis
                          dataKey="ts"
                          tickFormatter={(v) => formatXAxisTick(v as string, granularityFromParams(timeseriesParams))}
                          tick={{ fill: colors.fg.muted, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: colors.fg.muted, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <RechartsTooltip
                          contentStyle={{ background: colors.canvas.overlay, border: `1px solid ${colors.border.default}`, borderRadius: 6, fontSize: 12 }}
                          labelStyle={{ color: colors.fg.subtle }}
                          itemStyle={{ color: colors.accent.emphasis }}
                          labelFormatter={(v) => formatBucketLabel(new Date(v as string))}
                          formatter={(v) => [v, 'Calls']}
                        />
                        <Bar dataKey="call_count" fill={colors.accent.emphasis} radius={[3, 3, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Latency Line Chart */}
                  <Box
                    sx={{
                      border: `1px solid ${colors.border.muted}`,
                      borderRadius: '8px',
                      p: 2,
                      background: colors.canvas.subtle,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.fg.muted, mb: 1.5 }}>
                      Latency (ms)
                    </Typography>
                    {(() => {
                      const buckets = timeseries.buckets;
                      const bucketCount = buckets.length;
                      const dotStyle = bucketCount > 20 ? false : { r: 3 };

                      const enrichedBuckets = buckets.map((b) => ({
                        ...b,
                        band: b.avg_latency_ms !== null && b.p95_latency_ms !== null
                          ? [b.avg_latency_ms, b.p95_latency_ms] as [number, number]
                          : [null, null] as [null, null],
                      }));

                      const nullRanges: { x1: string; x2: string }[] = [];
                      let rangeStart: string | null = null;
                      for (let i = 0; i < buckets.length; i++) {
                        const isNull = buckets[i].avg_latency_ms === null;
                        if (isNull && rangeStart === null) {
                          rangeStart = buckets[i].ts;
                        } else if (!isNull && rangeStart !== null) {
                          nullRanges.push({ x1: rangeStart, x2: buckets[i - 1].ts });
                          rangeStart = null;
                        }
                      }
                      if (rangeStart !== null) {
                        nullRanges.push({ x1: rangeStart, x2: buckets[buckets.length - 1].ts });
                      }

                      return (
                        <ResponsiveContainer width="100%" height={180}>
                          <ComposedChart data={enrichedBuckets} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                            <CartesianGrid vertical={false} stroke={colors.border.muted} strokeDasharray="2 4" />
                            <XAxis
                              dataKey="ts"
                              tickFormatter={(v) => formatXAxisTick(v as string, granularityFromParams(timeseriesParams))}
                              tick={{ fill: colors.fg.muted, fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`}
                              tick={{ fill: colors.fg.subtle, fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              width={40}
                            />
                            <RechartsTooltip
                              content={<LatencyTooltip />}
                              cursor={{ stroke: colors.border.default, strokeWidth: 1 }}
                            />
                            <Legend
                              iconType="plainline"
                              wrapperStyle={{ fontSize: 11, color: colors.fg.muted }}
                              formatter={(value) => value === 'avg_latency_ms' ? 'Avg' : 'p95'}
                            />
                            {nullRanges.map((range, i) => (
                              <ReferenceArea
                                key={i}
                                x1={range.x1}
                                x2={range.x2}
                                fill={`${colors.fg.subtle}26`}
                                strokeOpacity={0}
                              />
                            ))}
                            <Area
                              dataKey="band"
                              stroke="none"
                              fill={CHART_AMBER}
                              fillOpacity={0.08}
                              connectNulls={false}
                              legendType="none"
                              activeDot={false}
                              isAnimationActive={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="avg_latency_ms"
                              stroke={CHART_TEAL}
                              strokeWidth={1.5}
                              dot={dotStyle}
                              activeDot={{ r: 4, strokeWidth: 0 }}
                              isAnimationActive={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="p95_latency_ms"
                              stroke={CHART_AMBER}
                              strokeWidth={1.5}
                              dot={dotStyle}
                              activeDot={{ r: 4, strokeWidth: 0 }}
                              isAnimationActive={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      );
                    })()}

                    {/* Interpretation Guide */}
                    <Box
                      sx={{
                        mt: 2,
                        p: '10px 14px',
                        background: colors.canvas.inset,
                        border: `1px solid ${colors.border.muted}`,
                        borderLeft: `2px solid ${colors.accent.emphasis}`,
                        borderRadius: '4px',
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.fg.subtle, mb: 0.75 }}>
                        How to read this chart
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: colors.fg.subtle, lineHeight: 1.6 }}>
                        The <span style={{ color: CHART_TEAL }}>Avg</span> line shows the typical response time experienced by most users.
                        The <span style={{ color: CHART_AMBER }}>p95</span> line shows the latency threshold that 95% of requests fall under —
                        meaning 1 in 20 requests takes longer than this value.
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: colors.fg.subtle, lineHeight: 1.6, mt: 0.75 }}>
                        A small gap between Avg and p95 indicates consistent performance.
                        A widening gap signals that a subset of requests are significantly slower,
                        which may point to cold starts, outliers, or resource contention.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : !timeseriesLoading ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    border: `1px solid ${colors.border.muted}`,
                    borderRadius: '8px',
                    background: colors.canvas.subtle,
                  }}
                >
                  <Typography sx={{ color: colors.fg.muted, fontWeight: 500, mb: 0.5 }}>
                    No data for this range
                  </Typography>
                  <Typography sx={{ color: colors.fg.subtle, fontSize: '0.8125rem' }}>
                    Try selecting a wider range
                  </Typography>
                </Box>
              ) : null}
            </>
          )}
        </Box>
      )}

      {/* ── Logs tab ── */}
      {activeTab === 3 && (
        <Box>
          {pendingLogs.length > 0 && (
            <Box
              onClick={() => {
                const merged = [...pendingLogs, ...logs];
                setLogs(merged);
                logsRef.current = merged;
                const ids = new Set(pendingLogs.map((l) => l.id));
                setNewLogIds(ids);
                setPendingLogs([]);
                setTimeout(() => setNewLogIds(new Set()), 2000);
              }}
              sx={{
                mb: 1.5,
                px: 2,
                py: 1,
                borderRadius: '8px',
                background: colors.accent.subtle,
                border: `1px solid ${colors.accent.muted}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': { background: colors.accent.muted },
              }}
            >
              <Typography sx={{ fontSize: '0.8125rem', color: colors.accent.fg, fontWeight: 500 }}>
                ↑ {pendingLogs.length} new {pendingLogs.length === 1 ? 'log' : 'logs'} — click to load
              </Typography>
            </Box>
          )}
          {logsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {logsError && <Alert severity="error">{logsError}</Alert>}
          {!logsLoading && !logsError && logs.length === 0 && (
            <Typography variant="body1" sx={{ color: colors.fg.subtle, py: 6, textAlign: 'center' }}>
              No logs yet.
            </Typography>
          )}
          {!logsLoading && !logsError && logs.length > 0 && (
            <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {logs.map((log) => {
                const isNew = newLogIds.has(log.id);
                const isError = log.status === 'error';
                const inputFmt = log.input !== null ? tryFormatJson(log.input) : null;
                const outputFmt = log.output !== null ? tryFormatJson(log.output) : null;
                return (
                <Accordion
                  key={log.id}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: isError
                      ? `1px solid ${colors.danger.muted}`
                      : isNew ? `1px solid ${colors.terminal.blue}80` : `1px solid ${colors.border.muted}`,
                    borderRadius: '8px !important',
                    background: isError
                      ? colors.danger.subtle
                      : isNew ? `${colors.terminal.blue}12` : colors.canvas.subtle,
                    transition: 'border-color 1s ease, background-color 1s ease',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': {
                      borderColor: isError
                        ? colors.danger.fg
                        : isNew ? `${colors.terminal.blue}80` : colors.border.default,
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: colors.fg.subtle }} />}
                    sx={{ minHeight: 44, px: 2, '& .MuiAccordionSummary-content': { my: 0 } }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', mr: 1 }}>
                      <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.default, flex: 1 }}>
                        {formatDateTime(log.called_at)}
                      </Typography>
                      {isError && (
                        <Box sx={{
                          px: 0.75, py: 0.125, borderRadius: '4px',
                          background: colors.danger.subtle,
                          border: `1px solid ${colors.danger.muted}`,
                          fontSize: '0.625rem', fontWeight: 600, color: colors.danger.fg,
                          lineHeight: 1.4, letterSpacing: '0.04em', flexShrink: 0,
                        }}>
                          error
                        </Box>
                      )}
                      <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle, flexShrink: 0 }}>
                        {log.latency_ms !== null ? `${log.latency_ms}ms` : '—'}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  {(log.input !== null || log.output !== null || isError) && (
                    <AccordionDetails sx={{ px: 2, pt: 0, pb: 1.5 }}>
                      <Divider sx={{ mb: 1.5 }} />
                      {isError && log.error_message && (
                        <Box sx={{
                          mb: 1.5, px: 1.25, py: 1,
                          borderRadius: '6px',
                          background: `${colors.danger.fg}14`,
                          border: `1px solid ${colors.danger.muted}`,
                          borderLeft: `3px solid ${colors.danger.fg}`,
                        }}>
                          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.danger.fg, mb: 0.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Error
                          </Typography>
                          <Typography component="pre" sx={{
                            fontFamily: monoFontFamily, fontSize: '0.75rem',
                            color: colors.danger.fg, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, opacity: 0.9,
                          }}>
                            {log.error_message}
                          </Typography>
                        </Box>
                      )}
                      {log.input !== null && (
                        <Box sx={{ mb: log.output !== null ? 1.5 : 0 }}>
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 0.75, py: 0.25, mb: 0.75, borderRadius: '4px',
                            backgroundColor: `${colors.terminal.blue}1F`,
                            border: `1px solid ${colors.terminal.blue}4D`,
                            color: colors.terminal.blue, fontSize: '0.625rem', fontWeight: 700,
                            letterSpacing: '0.08em', lineHeight: 1.4, textTransform: 'uppercase',
                          }}>
                            <CallReceivedIcon sx={{ fontSize: '0.7rem' }} />
                            INPUT
                          </Box>
                          {inputFmt?.isJson ? (
                            <Box
                              component="pre"
                              sx={{
                                fontFamily: monoFontFamily, fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
                                borderLeft: `2px solid ${colors.terminal.blue}59`, pl: 1.25,
                              }}
                              dangerouslySetInnerHTML={{ __html: highlightJson(inputFmt.formatted, theme.palette.mode) }}
                            />
                          ) : (
                            <Typography
                              component="pre"
                              sx={{
                                fontFamily: monoFontFamily, fontSize: '0.75rem',
                                color: colors.fg.default, whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word', m: 0,
                                borderLeft: `2px solid ${colors.terminal.blue}59`, pl: 1.25,
                              }}
                            >
                              {log.input}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {log.output !== null && (
                        <Box>
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.5,
                            px: 0.75, py: 0.25, mb: 0.75, borderRadius: '4px',
                            backgroundColor: `${colors.terminal.green}1F`,
                            border: `1px solid ${colors.terminal.green}4D`,
                            color: colors.terminal.green, fontSize: '0.625rem', fontWeight: 700,
                            letterSpacing: '0.08em', lineHeight: 1.4, textTransform: 'uppercase',
                          }}>
                            <CallMadeIcon sx={{ fontSize: '0.7rem' }} />
                            OUTPUT
                          </Box>
                          {outputFmt?.isJson ? (
                            <Box
                              component="pre"
                              sx={{
                                fontFamily: monoFontFamily, fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0,
                                borderLeft: `2px solid ${colors.terminal.green}59`, pl: 1.25,
                              }}
                              dangerouslySetInnerHTML={{ __html: highlightJson(outputFmt.formatted, theme.palette.mode) }}
                            />
                          ) : (
                            <Typography
                              component="pre"
                              sx={{
                                fontFamily: monoFontFamily, fontSize: '0.75rem',
                                color: colors.fg.default, whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word', m: 0,
                                borderLeft: `2px solid ${colors.terminal.green}59`, pl: 1.25,
                              }}
                            >
                              {log.output}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </AccordionDetails>
                  )}
                </Accordion>
              ); })}
            </Box>
            {logsTotalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={logsTotalPages}
                  page={logsPage}
                  onChange={(_, v) => setLogsPage(v)}
                  size="small"
                />
              </Box>
            )}
            </>
          )}
        </Box>
      )}

      {/* ── Settings tab ── */}
      {activeTab === 4 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Show in Flow
              </Typography>
              <Typography variant="caption" sx={{ color: colors.fg.muted }}>
                Include this chain in the agent's flow visualization.
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={chain.show_in_flow}
                  onChange={handleToggleShowInFlow}
                  disabled={showInFlowSaving}
                  size="small"
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          </Box>
        </Box>
      )}

      {/* ── Commit dialog ── */}
      <Dialog
        open={commitDialogOpen}
        onClose={() => setCommitDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Commit changes</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography
              component="label"
              variant="body1"
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              Commit message <span style={{ color: colors.danger.fg }}>*</span>
            </Typography>
            <TextField
              fullWidth
              placeholder="Describe what changed..."
              value={commitTitle}
              onChange={(e) => setCommitTitle(e.target.value)}
            />
          </Box>
          <Box>
            <Typography
              component="label"
              variant="body1"
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              Extended description{' '}
              <Typography component="span" variant="caption">
                (optional)
              </Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add more context about this change..."
              value={commitDescription}
              onChange={(e) => setCommitDescription(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setCommitDialogOpen(false)}>
            Cancel
          </Button>
          <Tooltip
            title={!commitTitle.trim() ? 'Required: commit message' : ''}
            placement="top"
            arrow
          >
            <span>
              <Button
                variant="contained"
                onClick={handleCommit}
                disabled={!commitTitle.trim()}
              >
                Commit changes
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* ── Rollback confirmation dialog ── */}
      <Dialog
        open={rollbackVersion !== null}
        onClose={() => { setRollbackVersion(null); setRollbackError(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Revert to v{rollbackVersion?.version_number}?</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body1">
            This will create a new version with the content of{' '}
            <strong style={{ color: colors.fg.default }}>v{rollbackVersion?.version_number}</strong>{' '}
            and update the chain. Existing history is preserved.
          </Typography>
          {rollbackError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {rollbackError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { setRollbackVersion(null); setRollbackError(null); }}
            disabled={rollingBack}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRollback}
            disabled={rollingBack}
            startIcon={rollingBack ? <CircularProgress size={14} color="inherit" /> : <RestoreOutlinedIcon sx={{ fontSize: 16 }} />}
          >
            {rollingBack ? 'Reverting...' : 'Revert'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete chain dialog ── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setDeleteConfirmName(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete chain</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            This will permanently delete{' '}
            <strong style={{ color: colors.fg.default }}>{chain.name}</strong> including all
            version history. This action cannot be undone.
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.muted }}>
            Type <strong style={{ color: colors.fg.default }}>{chain.name}</strong> to confirm.
          </Typography>
          <TextField
            size="small"
            placeholder={chain.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirmName === chain.name) handleDeleteChain();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmName(''); }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteChain}
            disabled={deleting || deleteConfirmName !== chain.name}
            sx={{
              '&.MuiButton-containedPrimary': {
                backgroundColor: colors.danger.emphasis,
                color: colors.fg.onEmphasis,
                '&:hover': { backgroundColor: '#b91c1c' },
              },
              '&.MuiButton-containedPrimary.Mui-disabled': {
                backgroundColor: colors.danger.emphasis,
                opacity: 0.4,
                color: colors.fg.onEmphasis,
              },
            }}
          >
            {deleting ? <CircularProgress size={16} color="inherit" /> : 'Delete chain'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
