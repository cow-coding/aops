import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Agent } from '../types/agent';
import type { ChainCreateRequest } from '../types/chain';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { monoFontFamily } from '../theme';

const NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function getDisabledReason(form: ChainCreateRequest): string {
  const issues: string[] = [];
  if (!form.name.trim()) issues.push('chain name');
  else if (!NAME_PATTERN.test(form.name)) issues.push('valid chain name');
  if (!form.content.trim()) issues.push('content');
  return issues.length ? `Required: ${issues.join(', ')}` : '';
}

export default function ChainCreatePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<ChainCreateRequest>({
    name: '',
    description: '',
    persona: '',
    content: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agentId) return;
    agentApi.getById(agentId).then(setAgent).catch(() => null);
  }, [agentId]);

  const handleChange = (field: keyof ChainCreateRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const isValid = form.name.trim() !== '' && NAME_PATTERN.test(form.name) && form.content.trim() !== '';
    if (!isValid) return;

    if (!agentId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.message?.trim()) delete payload.message;
      if (!payload.persona?.trim()) delete payload.persona;
      const created = await chainApi.create(agentId, payload);
      navigate(`/agents/${agentId}/chains/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chain');
    } finally {
      setSubmitting(false);
    }
  };

  const disabledReason = getDisabledReason(form);

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/agents/${agentId}`)}
        sx={{ mb: 2, color: colors.fg.muted, '&:hover': { color: colors.fg.default } }}
      >
        Back to {agent?.name ?? 'Agent'}
      </Button>

      <Typography variant="h2" sx={{ mb: 1 }}>
        Create a new chain
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        A chain defines a prompt with versioned history.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box>
          <Typography
            component="label"
            variant="body1"
            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
          >
            Chain name <span style={{ color: colors.danger.fg }}>*</span>
          </Typography>
          <TextField
            required
            fullWidth
            placeholder="my-chain"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            inputProps={{ maxLength: 100 }}
            error={(submitted && !form.name.trim()) || (!!form.name && !NAME_PATTERN.test(form.name))}
            helperText={
              submitted && !form.name.trim()
                ? 'Name is required'
                : form.name && !NAME_PATTERN.test(form.name)
                ? 'Lowercase letters, numbers, hyphens, and underscores only. Must start with a letter or number.'
                : 'A short, descriptive name for this chain.'
            }
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
            placeholder="Describe what this chain does..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </Box>

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
            value={form.persona}
            onChange={(e) => handleChange('persona', e.target.value)}
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
            required
            fullWidth
            multiline
            placeholder="// Enter prompt content..."
            value={form.content}
            onChange={(e) => handleChange('content', e.target.value)}
            error={submitted && !form.content.trim()}
            helperText={submitted && !form.content.trim() ? 'Content is required' : undefined}
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

        <Box>
          <Typography
            component="label"
            variant="body1"
            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
          >
            Commit message{' '}
            <Typography component="span" variant="caption">
              (optional)
            </Typography>
          </Typography>
          <TextField
            fullWidth
            placeholder="Initial version"
            value={form.message}
            onChange={(e) => handleChange('message', e.target.value)}
            helperText="Describe this initial version of the chain."
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate(`/agents/${agentId}`)}>
            Cancel
          </Button>
          <Tooltip title={disabledReason} placement="top" arrow>
            <span>
              <Button type="submit" variant="contained" disabled={!form.name.trim() || !NAME_PATTERN.test(form.name) || !form.content.trim() || submitting}>
                {submitting ? (
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                ) : (
                  'Create chain'
                )}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
