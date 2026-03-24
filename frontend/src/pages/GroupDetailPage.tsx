import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import type { Group, MemberWithUser } from '../types/group';
import { groupApi } from '../services/groupApi';

// ── Role badge ─────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: 'owner' | 'member' }) {
  const theme = useTheme();
  const colors = theme.colors;
  const isOwner = role === 'owner';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        px: 0.75,
        py: 0.25,
        borderRadius: '4px',
        border: `1px solid ${isOwner ? colors.attention.muted : colors.border.default}`,
        backgroundColor: isOwner ? colors.attention.subtle : colors.canvas.elevated,
      }}
    >
      <Typography
        sx={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: isOwner ? colors.attention.fg : colors.fg.muted,
          lineHeight: 1,
        }}
      >
        {role}
      </Typography>
    </Box>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const colors = theme.colors;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add member inline form state
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Per-row state
  const [removing, setRemoving] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  // Delete group state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const [groups, memberData] = await Promise.all([
        groupApi.list(),
        groupApi.getMembers(groupId),
      ]);
      const found = groups.find((g) => g.id === groupId);
      if (!found) {
        setError('Group not found.');
        return;
      }
      setGroup(found);
      setMembers(memberData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddMember() {
    if (!groupId || !addEmail.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const member = await groupApi.addMember(groupId, { email: addEmail.trim() });
      setMembers((prev) => [...prev, member]);
      setAddEmail('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add member.';
      if (msg.includes('404')) {
        setAddError('User not found. Check the email address.');
      } else if (msg.includes('409') || msg.includes('already')) {
        setAddError('This user is already a member of the group.');
      } else {
        setAddError(msg);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!groupId) return;
    setRemoving(userId);
    try {
      await groupApi.removeMember(groupId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: 'owner' | 'member') {
    if (!groupId) return;
    setUpdatingRole(userId);
    try {
      await groupApi.updateMemberRole(groupId, userId, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setUpdatingRole(null);
    }
  }

  async function handleDeleteGroup() {
    if (!groupId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await groupApi.deleteGroup(groupId);
      navigate('/groups');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete group');
      setDeleting(false);
    }
  }

  // Determine if current user is an owner
  const isOwner = members.some(
    (m) => m.user_id === currentUser?.id && m.role === 'owner'
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !group) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Group not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/groups')}>
          Back to Groups
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/groups')}
          sx={{ mb: 1.5, color: colors.fg.muted, '&:hover': { color: colors.fg.default } }}
        >
          Back to Groups
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <GroupsOutlinedIcon sx={{ fontSize: 28, color: colors.fg.muted, mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h2">{group.name}</Typography>
            {group.description && (
              <Typography
                variant="body1"
                sx={{ color: colors.fg.muted, mt: 0.25 }}
              >
                {group.description}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Members section */}
      <Box
        sx={{
          border: `1px solid ${colors.border.muted}`,
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${colors.border.muted}`,
            backgroundColor: colors.canvas.subtle,
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: colors.fg.default }}>
            Members · {members.length}
          </Typography>
        </Box>

        {/* Add member inline form */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${colors.border.muted}`,
            backgroundColor: colors.canvas.default,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              placeholder="user@example.com"
              type="email"
              value={addEmail}
              onChange={(e) => {
                setAddEmail(e.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && addEmail.trim() && !adding) handleAddMember();
              }}
              disabled={adding}
              sx={{ flex: 1 }}
              inputProps={{ 'aria-label': 'Member email' }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleAddMember}
              disabled={!addEmail.trim() || adding}
              sx={{ whiteSpace: 'nowrap', minWidth: 72 }}
            >
              {adding ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : 'Add'}
            </Button>
          </Box>
          {addError && (
            <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
              {addError}
            </Alert>
          )}
        </Box>

        {/* Error banner */}
        {error && (
          <Alert severity="error" sx={{ mx: 2.5, my: 1.5 }}>
            {error}
          </Alert>
        )}

        {/* Member rows */}
        {members.length === 0 ? (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.875rem', color: colors.fg.subtle }}>
              No members yet. Add someone above.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Table header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 140px 80px',
                px: 2.5,
                py: 1,
                borderBottom: `1px solid ${colors.border.muted}`,
                backgroundColor: colors.canvas.subtle,
              }}
            >
              {['Name', 'Email', 'Role', ''].map((label) => (
                <Typography
                  key={label}
                  sx={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: colors.fg.subtle,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>

            {members.map((m, idx) => (
              <Box
                key={m.user_id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 140px 80px',
                  alignItems: 'center',
                  px: 2.5,
                  py: 1.25,
                  borderBottom: idx < members.length - 1 ? `1px solid ${colors.border.muted}` : 'none',
                  '&:hover': { backgroundColor: colors.canvas.subtle },
                  transition: 'background-color 0.1s',
                }}
              >
                {/* Name + avatar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: alpha(colors.accent.fg, 0.15),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: colors.accent.fg }}>
                      {m.user.name.charAt(0).toUpperCase()}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: colors.fg.default,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.user.name}
                  </Typography>
                </Box>

                {/* Email */}
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    color: colors.fg.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    pr: 1,
                  }}
                >
                  {m.user.email}
                </Typography>

                {/* Role — fixed badge for self, Select for others */}
                <Box>
                  {currentUser?.id === m.user_id ? (
                    <RoleBadge role={m.role} />
                  ) : (
                    <Select
                      size="small"
                      value={m.role}
                      disabled={updatingRole === m.user_id}
                      onChange={(e) =>
                        handleRoleChange(m.user_id, e.target.value as 'owner' | 'member')
                      }
                      sx={{
                        fontSize: '0.8125rem',
                        height: 28,
                        '& .MuiSelect-select': { py: 0.375, px: 1 },
                      }}
                    >
                      <MenuItem value="member">member</MenuItem>
                      <MenuItem value="owner">owner</MenuItem>
                    </Select>
                  )}
                </Box>

                {/* Actions — hidden for self */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {currentUser?.id !== m.user_id ? (
                    <Tooltip title="Remove member">
                      <IconButton
                        size="small"
                        disabled={removing === m.user_id}
                        onClick={() => handleRemove(m.user_id)}
                        sx={{
                          p: 0.5,
                          color: colors.fg.subtle,
                          '&:hover': {
                            color: colors.danger.fg,
                            backgroundColor: alpha(colors.danger.fg, 0.08),
                          },
                        }}
                      >
                        {removing === m.user_id ? (
                          <CircularProgress size={14} sx={{ color: 'inherit' }} />
                        ) : (
                          <PersonRemoveOutlinedIcon sx={{ fontSize: 15 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Box sx={{ width: 30 }} />
                  )}
                </Box>
              </Box>
            ))}
          </>
        )}
      </Box>

      {/* ── Danger Zone (owner only) ── */}
      {isOwner && (
        <Box sx={{ mt: 4 }}>
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
                  Delete this group
                </Typography>
                <Typography variant="body2" sx={{ color: colors.fg.muted }}>
                  Permanently remove this group, all members, and shared agents.
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
                Delete group
              </Button>
            </Box>
          </Box>

          {deleteError && (
            <Typography color="error" sx={{ mt: 2, fontSize: '0.8125rem' }}>
              {deleteError}
            </Typography>
          )}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setDeleteConfirmName('');
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete group</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            This will permanently delete{' '}
            <strong style={{ color: colors.fg.default }}>{group?.name}</strong> including all
            members and shared agents. This action cannot be undone.
          </Typography>
          <Typography variant="body2" sx={{ color: colors.fg.muted }}>
            Type <strong style={{ color: colors.fg.default }}>{group?.name}</strong> to confirm.
          </Typography>
          <TextField
            size="small"
            placeholder={group?.name}
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            autoFocus
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter' && deleteConfirmName === group?.name) handleDeleteGroup();
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
            onClick={handleDeleteGroup}
            disabled={deleting || deleteConfirmName !== group?.name}
            sx={{
              '&.MuiButton-containedPrimary': {
                backgroundColor: colors.danger.emphasis,
                color: colors.fg.onEmphasis,
                '&:hover': { backgroundColor: '#b91c1c' },
              },
              '&.MuiButton-containedPrimary.Mui-disabled': {
                backgroundColor: colors.danger.emphasis,
                opacity: 0.4,
              },
            }}
          >
            {deleting ? (
              <CircularProgress size={16} sx={{ color: 'inherit' }} />
            ) : (
              'Delete group'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
