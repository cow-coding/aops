import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { diffLines } from 'diff';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
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
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined';
import type { Agent } from '../types/agent';
import type { Chain, ChainUpdateRequest, ChainVersion } from '../types/chain';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { monoFontFamily } from '../theme';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

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
          {formatDate(version.created_at)}
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

export default function ChainDetailPage() {
  const { agentId, chainId } = useParams<{ agentId: string; chainId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [versions, setVersions] = useState<ChainVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
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
      navigate(`/agents/${agentId}`);
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/agents/${agentId}`)}>
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
        onClick={() => navigate(`/agents/${agentId}`)}
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

      <Typography
        variant="body1"
        sx={{ color: chain.description ? colors.fg.muted : colors.fg.subtle, mb: 2 }}
      >
        {chain.description ?? 'No description'}
      </Typography>

      {/* Tabs + Edit button row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.border.muted}`,
          mb: 3,
        }}
      >
        <Tabs value={activeTab} onChange={(_, v) => { setActiveTab(v); setEditing(false); setForm({}); setSaveError(null); }}>
          <Tab label="Prompt" />
          <Tab label="History" />
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
                  minRows={8}
                  maxRows={24}
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
                          <CircularProgress size={16} sx={{ color: 'white', mr: 1 }} />
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
            startIcon={rollingBack ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <RestoreOutlinedIcon sx={{ fontSize: 16 }} />}
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
            {deleting ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Delete chain'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
