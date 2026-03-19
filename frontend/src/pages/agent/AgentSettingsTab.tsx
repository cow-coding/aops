import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { AgentDetailContext } from '../../types/agentDetail';
import { agentApi } from '../../services/agentApi';

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
