import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { AgentDetailContext } from '../../types/agentDetail';
import { agentApi } from '../../services/agentApi';
import { monoFontFamily } from '../../theme';

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

      {/* ── Left: About card ── */}
      <Box
        sx={{
          flex: '1 1 0',
          minWidth: 0,
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
            {new Date(agent.created_at).toLocaleString()}
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
            {new Date(agent.updated_at).toLocaleString()}
          </Typography>
        </Box>
      </Box>

    </Box>
  );
}
