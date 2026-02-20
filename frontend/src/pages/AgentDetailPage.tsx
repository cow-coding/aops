import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { Agent } from '../types/agent';
import { agentApi } from '../services/agentApi';
import { colors } from '../theme';

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    agentApi
      .getById(id)
      .then(setAgent)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
        <Typography color="error">
          {error ?? 'Agent not found'}
        </Typography>
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
    </Box>
  );
}
