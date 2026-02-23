import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CheckIcon from '@mui/icons-material/Check';
import type { Agent } from '../types/agent';
import type { Chain } from '../types/chain';
import type { ApiKey, ApiKeyCreateResponse } from '../types/apiKey';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { apiKeyApi } from '../services/apiKeyApi';
import { colors, monoFontFamily } from '../theme';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

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

// ── Create Key Dialog ────────────────────────────────────────────────────────

interface CreateKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: ApiKeyCreateResponse) => void;
  agentId: string;
}

function CreateKeyDialog({ open, onClose, onCreated, agentId }: CreateKeyDialogProps) {
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

        {/* Key display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            background: colors.canvas.inset,
            border: `1px solid ${colors.border.default}`,
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
              color: colors.fg.default,
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

        {/* Usage snippet */}
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75 }}>
          Usage
        </Typography>
        <Box
          sx={{
            background: colors.canvas.inset,
            border: `1px solid ${colors.border.default}`,
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
            backgroundColor: colors.danger.emphasis,
            '&:hover': { backgroundColor: '#b91c1c' },
          }}
        >
          {loading ? 'Revoking...' : 'Revoke key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [chains, setChains] = useState<Chain[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [revealResult, setRevealResult] = useState<ApiKeyCreateResponse | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([agentApi.getById(id), chainApi.list(id), apiKeyApi.list(id)])
      .then(([ag, ch, keys]) => {
        setAgent(ag);
        setChains(ch);
        setApiKeys(keys);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function handleKeyCreated(result: ApiKeyCreateResponse) {
    setApiKeys((prev) => [result, ...prev]);
    setCreateOpen(false);
    setRevealResult(result);
  }

  async function handleRevoke() {
    if (!revokeTarget || !id) return;
    await apiKeyApi.revoke(id, revokeTarget.id);
    setApiKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id));
    setRevokeTarget(null);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !agent) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Agent not found'}</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/agents')}
          sx={{ mt: 2 }}
        >
          Back to Agents
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/agents')}
        sx={{ mb: 2 }}
      >
        Back to Agents
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <SmartToyOutlinedIcon sx={{ fontSize: 32, color: colors.fg.muted }} />
        <Typography variant="h2">{agent.name}</Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Metadata */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Description
          </Typography>
          <Typography variant="body1">
            {agent.description ?? 'No description'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Created
          </Typography>
          <Typography variant="body1">
            {new Date(agent.created_at).toLocaleString()}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Last Updated
          </Typography>
          <Typography variant="body1">
            {new Date(agent.updated_at).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Chains section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Chains</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate(`/agents/${id}/chains/new`)}
        >
          New Chain
        </Button>
      </Box>

      <Divider />

      {chains.length === 0 ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <AccountTreeOutlinedIcon sx={{ fontSize: 48, color: colors.fg.subtle }} />
          <Typography
            variant="body1"
            sx={{ color: colors.fg.default, mt: 2, mb: 0.5, fontWeight: 500 }}
          >
            No chains yet
          </Typography>
          <Typography variant="body1" sx={{ color: colors.fg.muted, mb: 2.5 }}>
            Add a chain to define prompts for this agent.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`/agents/${id}/chains/new`)}
          >
            New Chain
          </Button>
        </Box>
      ) : (
        <Box>
          {chains.map((chain) => (
            <Box key={chain.id}>
              <Box
                onClick={() => navigate(`/agents/${id}/chains/${chain.id}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  py: 1.5,
                  px: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
                  borderRadius: 1,
                }}
              >
                <AccountTreeOutlinedIcon
                  sx={{ fontSize: 20, color: colors.fg.subtle, mt: 0.25, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      sx={{
                        color: colors.accent.fg,
                        fontWeight: 600,
                        fontSize: '1rem',
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chain.name}
                    </Typography>
                    <Typography
                      sx={{
                        color: colors.fg.subtle,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        ml: 'auto',
                      }}
                    >
                      {relativeTime(chain.updated_at)}
                    </Typography>
                  </Box>
                  {chain.description && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: colors.fg.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chain.description}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Divider />
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* API Keys section */}
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
                <KeyOutlinedIcon
                  sx={{ fontSize: 18, color: colors.fg.subtle, flexShrink: 0 }}
                />
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
                    Created {new Date(apiKey.created_at).toLocaleDateString()} ·{' '}
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

      {/* Dialogs */}
      <CreateKeyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleKeyCreated}
        agentId={id!}
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
