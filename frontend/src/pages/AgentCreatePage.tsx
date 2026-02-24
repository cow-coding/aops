import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { AgentCreateRequest } from '../types/agent';
import { agentApi } from '../services/agentApi';

function getDisabledReason(form: AgentCreateRequest): string {
  if (!form.name.trim()) return 'Required: agent name';
  return '';
}

export default function AgentCreatePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [form, setForm] = useState<AgentCreateRequest>({
    name: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof AgentCreateRequest, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const isValid = form.name.trim() !== '';
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      const created = await agentApi.create(form);
      navigate(`/agents/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  const disabledReason = getDisabledReason(form);

  return (
    <Box sx={{ maxWidth: 640 }}>
      {/* Page header */}
      <Typography variant="h2" sx={{ mb: 1 }}>
        Create a new agent
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        An agent manages and executes tasks autonomously.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Agent name */}
        <Box>
          <Typography
            component="label"
            variant="body1"
            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
          >
            Agent name <span style={{ color: colors.danger.fg }}>*</span>
          </Typography>
          <TextField
            required
            fullWidth
            placeholder="my-agent"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={submitted && !form.name.trim()}
            helperText={
              submitted && !form.name.trim()
                ? 'Agent name is required'
                : 'Great names are short and memorable.'
            }
          />
        </Box>

        {/* Description */}
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
            rows={3}
            placeholder="Describe what this agent does..."
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </Box>

        <Divider />

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate('/agents')}>
            Cancel
          </Button>
          <Tooltip title={disabledReason} placement="top" arrow>
            <span>
              <Button
                type="submit"
                variant="contained"
                disabled={!form.name.trim() || submitting}
              >
                {submitting ? (
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                ) : (
                  'Create agent'
                )}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
