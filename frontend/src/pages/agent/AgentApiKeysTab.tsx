import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import type { ApiKey, ApiKeyCreateResponse } from '../../types/apiKey';
import type { AgentDetailContext } from '../../types/agentDetail';
import { apiKeyApi } from '../../services/apiKeyApi';
import { monoFontFamily } from '../../theme';

function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ── Create Key Dialog ────────────────────────────────────────────────────────

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: ApiKeyCreateResponse) => void;
  agentId: string;
}

function CreateKeyDialog({ open, onClose, onCreated, agentId }: CreateKeyDialogProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setName('');
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiKeyApi.create(agentId, { name: name.trim() });
      setName('');
      onCreated(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create API key</DialogTitle>
      <DialogContent sx={{ pt: '16px !important', pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Typography variant="body2" sx={{ color: colors.fg.muted, mb: 2 }}>
          Give this key a name so you can identify it later.
        </Typography>
        <TextField
          label="Key name"
          placeholder="Production"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          required
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {loading ? 'Creating...' : 'Create key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Reveal Key Dialog ────────────────────────────────────────────────────────

interface RevealKeyDialogProps {
  open: boolean;
  result: ApiKeyCreateResponse | null;
  onClose: () => void;
}

function RevealKeyDialog({ open, result, onClose }: RevealKeyDialogProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const usageSnippet = result
    ? `import aoops\naoops.init(api_key="${result.key}")`
    : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>API key created</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This key will only be shown once. Copy it now — you won't be able to see it again.
        </Alert>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
          {result?.name}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: colors.canvas.inset,
            border: `1px solid ${colors.border.muted}`,
            borderRadius: 1,
            px: 1.5,
            py: 1,
            mb: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: monoFontFamily,
              fontSize: '0.8125rem',
              color: colors.terminal.green,
              flex: 1,
              wordBreak: 'break-all',
            }}
          >
            {result?.key}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy key'}>
            <IconButton size="small" onClick={handleCopy} sx={{ flexShrink: 0 }}>
              {copied ? (
                <CheckIcon sx={{ fontSize: 16, color: colors.success.fg }} />
              ) : (
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
          Usage
        </Typography>
        <Box
          sx={{
            background: colors.canvas.inset,
            border: `1px solid ${colors.border.muted}`,
            borderRadius: 1,
            px: 1.5,
            py: 1.25,
          }}
        >
          <Typography
            component="pre"
            sx={{
              fontFamily: monoFontFamily,
              fontSize: '0.8125rem',
              color: colors.fg.default,
              m: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {usageSnippet}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Revoke Confirm Dialog ────────────────────────────────────────────────────

interface RevokeDialogProps {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function RevokeDialog({ open, apiKey, onClose, onConfirm }: RevokeDialogProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Revoke API key</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Typography variant="body1">
          Are you sure you want to revoke{' '}
          <Typography component="span" sx={{ fontWeight: 600 }}>
            "{apiKey?.name}"
          </Typography>
          ? Any application using this key will immediately lose access.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
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
          {loading ? 'Revoking...' : 'Revoke key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Tab ────────────────────────────────────────────────────────────────

function relativeUsed(dateStr: string | null): string {
  if (!dateStr) return 'Never used';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Used just now';
  if (minutes < 60) return `Used ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Used ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Used ${days}d ago`;
}

export default function AgentApiKeysTab() {
  const { agent, apiKeys, setApiKeys } = useOutletContext<AgentDetailContext>();
  const theme = useTheme();
  const colors = theme.colors;

  const [createOpen, setCreateOpen] = useState(false);
  const [revealResult, setRevealResult] = useState<ApiKeyCreateResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  function handleKeyCreated(result: ApiKeyCreateResponse) {
    setApiKeys((prev) => [result, ...prev]);
    setCreateOpen(false);
    setRevealResult(result);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    await apiKeyApi.revoke(agent.id, revokeTarget.id);
    setApiKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    setRevokeTarget(null);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">API Keys</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => setCreateOpen(true)}
        >
          New API Key
        </Button>
      </Box>

      <Divider />

      {apiKeys.length === 0 ? (
        <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <KeyOutlinedIcon sx={{ fontSize: 44, color: colors.fg.subtle }} />
          <Typography
            variant="body1"
            sx={{ color: colors.fg.default, mt: 2, mb: 0.5, fontWeight: 500 }}
          >
            No API keys yet
          </Typography>
          <Typography variant="body1" sx={{ color: colors.fg.muted, mb: 2.5 }}>
            Issue a key to connect this agent with the aoops library.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setCreateOpen(true)}
          >
            New API Key
          </Button>
        </Box>
      ) : (
        <Box>
          {apiKeys.map((apiKey) => (
            <Box key={apiKey.id}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  py: 1.5,
                  px: 1,
                  borderRadius: 1,
                }}
              >
                <KeyOutlinedIcon sx={{ fontSize: 18, color: colors.fg.subtle, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.25 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {apiKey.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: monoFontFamily,
                        fontSize: '0.75rem',
                        color: colors.fg.subtle,
                      }}
                    >
                      {apiKey.key_prefix}…
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: colors.fg.subtle }}>
                    Created {formatDateOnly(apiKey.created_at)} ·{' '}
                    {relativeUsed(apiKey.last_used_at)}
                  </Typography>
                </Box>
                <Tooltip title="Revoke key">
                  <IconButton
                    size="small"
                    onClick={() => setRevokeTarget(apiKey)}
                    sx={{ color: colors.fg.subtle, '&:hover': { color: colors.danger.fg } }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider />
            </Box>
          ))}
        </Box>
      )}

      <CreateKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleKeyCreated}
        agentId={agent.id}
      />

      <RevealKeyDialog
        open={revealResult !== null}
        result={revealResult}
        onClose={() => setRevealResult(null)}
      />

      <RevokeDialog
        open={revokeTarget !== null}
        apiKey={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </Box>
  );
}
