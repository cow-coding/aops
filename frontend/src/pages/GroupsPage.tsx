import { useEffect, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import type { Group } from '../types/group';
import { groupApi } from '../services/groupApi';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CreateGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (group: Group) => void;
}) {
  const theme = useTheme();
  const colors = theme.colors;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const group = await groupApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onCreated(group);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create a group</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box>
            <Typography
              component="label"
              variant="body1"
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              Group name <span style={{ color: colors.danger.fg }}>*</span>
            </Typography>
            <TextField
              fullWidth
              placeholder="my-team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Box>
          <Box>
            <Typography
              component="label"
              variant="body1"
              sx={{ fontWeight: 600, display: 'block', mb: 1 }}
            >
              Description{' '}
              <Typography component="span" variant="caption">
                (optional)
              </Typography>
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="What does this group do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || submitting}
        >
          {submitting ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function GroupsPage() {
  const theme = useTheme();
  const colors = theme.colors;

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    groupApi
      .list()
      .then(setGroups)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">Failed to load groups: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Groups</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New group
        </Button>
      </Box>

      {groups.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
          }}
        >
          <GroupsOutlinedIcon sx={{ fontSize: 64, color: colors.fg.subtle, mb: 2 }} />
          <Typography sx={{ fontSize: '1.25rem', mb: 1 }}>No groups yet</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create a group to share agents with your team.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create a group
          </Button>
        </Box>
      ) : (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {groups.map((group) => (
              <Box
                key={group.id}
                sx={{
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '8px',
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <GroupsOutlinedIcon sx={{ fontSize: 16, color: colors.fg.subtle, flexShrink: 0 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: colors.accent.fg,
                      }}
                    >
                      {group.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        color: colors.fg.subtle,
                        ml: 'auto',
                        flexShrink: 0,
                      }}
                    >
                      Created {timeAgo(group.created_at)}
                    </Typography>
                  </Box>
                  {group.description && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: colors.fg.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}

      <CreateGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(group) => setGroups((prev) => [group, ...prev])}
      />
    </Box>
  );
}
