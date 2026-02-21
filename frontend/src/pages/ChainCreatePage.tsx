import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Agent } from '../types/agent';
import type { ChainCreateRequest } from '../types/chain';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { colors, monoFontFamily } from '../theme';

export default function ChainCreatePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState<ChainCreateRequest>({
    name: '',
    description: '',
    persona: '',
    content: '',
    message: '',
  });
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
    if (!agentId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!payload.message?.trim()) delete payload.message;
      const created = await chainApi.create(agentId, payload);
      navigate(`/agents/${agentId}/chains/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chain');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid =
    form.name.trim() !== '' && form.persona.trim() !== '' && form.content.trim() !== '';

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
            helperText="A short, descriptive name for this chain."
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
            Persona <span style={{ color: colors.danger.fg }}>*</span>
          </Typography>
          <TextField
            required
            fullWidth
            placeholder="e.g. Senior Engineer, Product Manager, QA Tester..."
            value={form.persona}
            onChange={(e) => handleChange('persona', e.target.value)}
            helperText="The role this chain's prompt will act as."
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
            minRows={8}
            maxRows={24}
            placeholder="Enter prompt content..."
            value={form.content}
            onChange={(e) => handleChange('content', e.target.value)}
            inputProps={{
              style: {
                fontFamily: monoFontFamily,
                fontSize: '0.875rem',
                lineHeight: 1.6,
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
          <Button type="submit" variant="contained" disabled={!isValid || submitting}>
            {submitting ? (
              <CircularProgress size={16} sx={{ color: 'white' }} />
            ) : (
              'Create chain'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
