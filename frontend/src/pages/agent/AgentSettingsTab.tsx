import { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { AgentDetailContext } from '../../types/agentDetail';
import type { HealthConfig, HealthCheckLog, HealthConfigCreateRequest } from '../../types/healthCheck';
import { agentApi } from '../../services/agentApi';

// ── Interval options ───────────────────────────────────────────────────────────

const INTERVAL_OPTIONS = [
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 120, label: '120s' },
  { value: 300, label: '300s' },
];

// ── Trigger result display ─────────────────────────────────────────────────────

function HealthCheckLogBadge({ result }: { result: HealthCheckLog }) {
  const theme = useTheme();
  const colors = theme.colors;

  const isUp = result.status === 'up';
  const color = isUp ? colors.success.fg : colors.danger.fg;
  const bg = isUp ? colors.success.subtle : colors.danger.subtle;
  const border = isUp ? colors.success.muted : colors.danger.muted;
  const Icon = isUp ? CheckCircleOutlineIcon : ErrorOutlineIcon;
  const label = result.status.charAt(0).toUpperCase() + result.status.slice(1);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.625,
        borderRadius: '6px',
        border: `1px solid ${border}`,
        background: bg,
        mt: 1,
        flexWrap: 'wrap',
      }}
    >
      <Icon sx={{ fontSize: 14, color }} />
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color }}>
        {label}
        {result.status_code != null && ` (HTTP ${result.status_code})`}
        {result.latency_ms != null && ` — ${Math.round(result.latency_ms)}ms`}
      </Typography>
      {result.error_message && (
        <Typography sx={{ fontSize: '0.75rem', color, opacity: 0.8 }}>
          {result.error_message}
        </Typography>
      )}
    </Box>
  );
}

// ── Verified badge ────────────────────────────────────────────────────────────

function VerifiedBadge({ verifiedAt }: { verifiedAt: string | null }) {
  const theme = useTheme();
  const colors = theme.colors;
  const timeLabel = verifiedAt
    ? new Date(verifiedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: '6px',
        border: `1px solid ${colors.success.muted}`,
        background: colors.success.subtle,
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 13, color: colors.success.fg }} />
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.success.fg }}>
        Verified{timeLabel ? ` · ${timeLabel}` : ''}
      </Typography>
    </Box>
  );
}

// ── Health Check section ───────────────────────────────────────────────────────

function HealthCheckSection({ agentId }: { agentId: string }) {
  const theme = useTheme();
  const colors = theme.colors;

  const [config, setConfig] = useState<HealthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [triggerResult, setHealthCheckLog] = useState<HealthCheckLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [url, setUrl] = useState('');
  const [intervalSec, setIntervalSec] = useState(60);
  const [timeoutSec, setTimeoutSec] = useState(10);
  const [enabled, setEnabled] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await agentApi.getHealthConfig(agentId);
      setConfig(data);
      setUrl(data.health_url);
      setIntervalSec(data.interval_sec);
      setTimeoutSec(data.timeout_sec);
      setEnabled(data.enabled);
    } catch (err: unknown) {
      // 404 means no config yet — not an error
      if (err instanceof Error && err.message.includes('404')) {
        setConfig(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load health config');
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  function validateUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('URL must start with http:// or https://');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Enter a valid URL');
      return false;
    }
  }

  async function handleSave() {
    if (!validateUrl(url)) return;
    setSaving(true);
    setError(null);
    try {
      const payload: HealthConfigCreateRequest = {
        health_url: url,
        interval_sec: intervalSec,
        timeout_sec: timeoutSec,
        enabled,
      };
      let updated: HealthConfig;
      if (config) {
        updated = await agentApi.updateHealthConfig(agentId, payload);
      } else {
        updated = await agentApi.createHealthConfig(agentId, payload);
      }
      setConfig(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!config && msg.includes('400')) {
        setError(
          'Health URL verification failed. Make sure your agent server has the /aops-health endpoint.',
        );
      } else {
        setError(msg || 'Failed to save health config');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      await agentApi.deleteHealthConfig(agentId);
      setConfig(null);
      setUrl('');
      setIntervalSec(60);
      setTimeoutSec(10);
      setEnabled(true);
      setHealthCheckLog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete health config');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNow() {
    if (!validateUrl(url)) return;
    setTesting(true);
    setHealthCheckLog(null);
    setError(null);
    try {
      const result = await agentApi.triggerHealthCheck(agentId);
      setHealthCheckLog(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger health check');
    } finally {
      setTesting(false);
    }
  }

  const isDirty =
    !config ||
    url !== config.health_url ||
    intervalSec !== config.interval_sec ||
    timeoutSec !== config.timeout_sec ||
    enabled !== config.enabled;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Box>
      {/* URL input */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.fg.default, mb: 0.5 }}
        >
          Health Check URL
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="https://your-agent.example.com/health"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (urlError) validateUrl(e.target.value);
          }}
          error={!!urlError}
          helperText={urlError ?? undefined}
        />
      </Box>

      {/* Interval + Timeout + Enabled row */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '0 0 auto' }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.fg.default, mb: 0.5 }}
          >
            Interval
          </Typography>
          <Select
            size="small"
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            sx={{ minWidth: 100 }}
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <Box sx={{ flex: '0 0 auto' }}>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 500, color: colors.fg.default, mb: 0.5 }}
          >
            Timeout (seconds)
          </Typography>
          <TextField
            size="small"
            type="number"
            value={timeoutSec}
            onChange={(e) => setTimeoutSec(Math.max(1, Number(e.target.value)))}
            inputProps={{ min: 1, max: 60 }}
            sx={{ width: 120 }}
          />
        </Box>

        <Box sx={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted }}>
                Enabled
              </Typography>
            }
            sx={{ mb: 0 }}
          />
        </Box>
      </Box>

      {/* Verified badge */}
      {config?.verified && <VerifiedBadge verifiedAt={config.verified_at} />}

      {/* Test result */}
      {triggerResult && <HealthCheckLogBadge result={triggerResult} />}

      {/* Error */}
      {error && (
        <Typography sx={{ fontSize: '0.8125rem', color: colors.danger.fg, mt: 1 }}>
          {error}
        </Typography>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving || !url || !isDirty}
        >
          {saving ? (
            <CircularProgress size={14} sx={{ color: 'inherit' }} />
          ) : config ? (
            'Save changes'
          ) : (
            'Enable health check'
          )}
        </Button>

        <Button
          variant="outlined"
          size="small"
          onClick={handleTestNow}
          disabled={testing || !url}
          startIcon={testing ? <CircularProgress size={12} sx={{ color: 'inherit' }} /> : undefined}
        >
          {testing ? 'Testing…' : 'Test now'}
        </Button>

        {config && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleDelete}
            disabled={saving}
            sx={{
              ml: 'auto',
              borderColor: alpha(colors.danger.fg, 0.4),
              color: colors.danger.fg,
              '&:hover': {
                borderColor: colors.danger.fg,
                backgroundColor: colors.danger.subtle,
              },
            }}
          >
            Remove
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ── Main tab ───────────────────────────────────────────────────────────────────

export default function AgentSettingsTab() {
  const { agent } = useOutletContext<AgentDetailContext>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAgent() {
    setDeleting(true);
    try {
      await agentApi.delete(agent.id);
      navigate('/agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Health Check section ── */}
      <Box>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Health Check
        </Typography>
        <Box
          sx={{
            border: `1px solid ${colors.border.muted}`,
            borderRadius: 2,
            p: 2.5,
            background: colors.canvas.subtle,
          }}
        >
          <Typography variant="body2" sx={{ color: colors.fg.muted, mb: 2 }}>
            Configure a periodic HTTP health check for this agent. AOps will ping the URL at the
            specified interval and track availability over time.
          </Typography>
          <HealthCheckSection agentId={agent.id} />
        </Box>
      </Box>

      {/* ── Danger Zone ── */}
      <Box>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Danger Zone
        </Typography>
        <Box
          sx={{
            border: `1px solid ${colors.danger.muted}`,
            borderRadius: 2,
            p: 2.5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Delete this agent
              </Typography>
              <Typography variant="body2" sx={{ color: colors.fg.muted }}>
                Permanently remove this agent, all chains, version history, and API keys.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              sx={{
                borderColor: colors.danger.muted,
                color: colors.danger.fg,
                flexShrink: 0,
                '&:hover': {
                  borderColor: colors.danger.fg,
                  backgroundColor: colors.danger.subtle,
                },
              }}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete agent
            </Button>
          </Box>
        </Box>

        {error && (
          <Typography color="error" sx={{ mt: 2, fontSize: '0.8125rem' }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Delete agent dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmName('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete agent</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            This will permanently delete{' '}
            <strong style={{ color: colors.fg.default }}>{agent.name}</strong> including all
            chains, version history, and API keys. This action cannot be undone.
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.muted }}>
            Type <strong style={{ color: colors.fg.default }}>{agent.name}</strong> to confirm.
          </Typography>
          <TextField
            size="small"
            placeholder={agent.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirmName === agent.name) handleDeleteAgent();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmName('');
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteAgent}
            disabled={deleting || deleteConfirmName !== agent.name}
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
            {deleting ? (
              <CircularProgress size={16} sx={{ color: 'inherit' }} />
            ) : (
              'Delete agent'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
