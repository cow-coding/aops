import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Divider, IconButton, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { User } from '../types/auth';
import { authApi } from '../services/authApi';
import { formatDateTime } from '../utils/date';

export default function ProfilePage() {
  const theme = useTheme();
  const colors = theme.colors;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    authApi.getMe()
      .then((u) => { setUser(u); setNameValue(u.name); })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleNameSave() {
    if (!user) return;
    if (nameValue.trim() === user.name) { setEditingName(false); return; }
    setNameSaving(true);
    setNameError(null);
    try {
      const updated = await authApi.updateMe({ name: nameValue.trim() });
      setUser(updated);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setNameSaving(false);
    }
  }

  function handleNameCancel() {
    setEditingName(false);
    setNameValue(user?.name ?? '');
    setNameError(null);
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && e.ctrlKey) handleNameSave();
    if (e.key === 'Escape') handleNameCancel();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4, px: 2 }}>
        <Typography sx={{ color: colors.danger.fg }}>{error ?? 'Failed to load profile.'}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', py: 4, px: 2 }}>
      <Typography variant="h2" sx={{ mb: 3 }}>Profile</Typography>

      {/* ── Section 1: Profile Info ── */}
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: colors.fg.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 1,
        }}
      >
        Profile Info
      </Typography>
      <Divider sx={{ mb: 2.5 }} />

      {/* Name */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: colors.fg.subtle, mb: 0.5 }}>Name</Typography>
        {editingName ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleNameKeyDown}
              autoFocus
              disabled={nameSaving}
              error={!!nameError}
              helperText={nameError}
              sx={{ width: 280 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button size="small" variant="contained" onClick={handleNameSave} disabled={nameSaving}>
                {nameSaving ? <CircularProgress size={12} color="inherit" /> : 'Save'}
              </Button>
              <Button size="small" variant="outlined" onClick={handleNameCancel} disabled={nameSaving}>
                Cancel
              </Button>
              <Typography variant="caption" sx={{ color: colors.fg.subtle, ml: 'auto' }}>
                Ctrl+Enter to save
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mx: -1 }}>
            <Typography
              sx={{
                fontSize: '0.9375rem',
                color: user.name ? colors.fg.default : colors.fg.subtle,
                fontStyle: user.name ? 'normal' : 'italic',
                px: 1,
                py: 0.5,
              }}
            >
              {user.name || 'No name'}
            </Typography>
            <IconButton
              size="small"
              onClick={() => { setNameValue(user.name); setNameError(null); setEditingName(true); }}
              sx={{
                p: 0.375,
                color: colors.fg.subtle,
                '&:hover': { color: colors.fg.muted, backgroundColor: colors.canvas.elevated },
              }}
            >
              <EditOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Email */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="body2" sx={{ color: colors.fg.subtle, mb: 0.5 }}>Email</Typography>
        <Typography sx={{ fontSize: '0.9375rem', color: colors.fg.default }}>{user.email}</Typography>
      </Box>

      {/* Member since */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ color: colors.fg.subtle, mb: 0.5 }}>Member since</Typography>
        <Typography sx={{ fontSize: '0.9375rem', color: colors.fg.default }}>
          {user.created_at ? formatDateTime(user.created_at) : '—'}
        </Typography>
      </Box>

      {/* ── Section 2: Security ── */}
      <Typography
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: colors.fg.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 1,
        }}
      >
        Security
      </Typography>
      <Divider sx={{ mb: 2.5 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontSize: '0.9375rem', color: colors.fg.muted }}>Change Password</Typography>
        <Chip label="Coming soon" size="small" disabled />
      </Box>
    </Box>
  );
}
