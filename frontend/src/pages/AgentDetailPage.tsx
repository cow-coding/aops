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
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import type { Agent } from '../types/agent';
import type { Chain } from '../types/chain';
import { agentApi } from '../services/agentApi';
import { chainApi } from '../services/chainApi';
import { colors } from '../theme';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([agentApi.getById(id), chainApi.list(id)])
      .then(([ag, ch]) => {
        setAgent(ag);
        setChains(ch);
      })
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

      <Divider sx={{ my: 3 }} />

      {/* Chains section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Chains</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate(`/agents/${id}/chains/new`)}
        >
          New Chain
        </Button>
      </Box>

      <Divider />

      {chains.length === 0 ? (
        <Box
          sx={{
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <AccountTreeOutlinedIcon sx={{ fontSize: 48, color: colors.fg.subtle }} />
          <Typography
            variant="body1"
            sx={{ color: colors.fg.default, mt: 2, mb: 0.5, fontWeight: 500 }}
          >
            No chains yet
          </Typography>
          <Typography variant="body1" sx={{ color: colors.fg.muted, mb: 2.5 }}>
            Add a chain to define prompts for this agent.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate(`/agents/${id}/chains/new`)}
          >
            New Chain
          </Button>
        </Box>
      ) : (
        <Box>
          {chains.map((chain) => (
            <Box key={chain.id}>
              <Box
                onClick={() => navigate(`/agents/${id}/chains/${chain.id}`)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  py: 1.5,
                  px: 1,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
                  borderRadius: 1,
                }}
              >
                <AccountTreeOutlinedIcon
                  sx={{ fontSize: 20, color: colors.fg.subtle, mt: 0.25, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography
                      sx={{
                        color: colors.accent.fg,
                        fontWeight: 600,
                        fontSize: '1rem',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chain.name}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        borderRadius: '20px',
                        padding: '1px 7px',
                        color: colors.accent.fg,
                        background: 'rgba(88,166,255,0.1)',
                        border: '1px solid rgba(88,166,255,0.4)',
                        flexShrink: 0,
                      }}
                    >
                      {chain.persona}
                    </Box>
                    <Typography
                      sx={{
                        color: colors.fg.subtle,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                        ml: 'auto',
                      }}
                    >
                      {relativeTime(chain.updated_at)}
                    </Typography>
                  </Box>
                  {chain.description && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: colors.fg.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {chain.description}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Divider />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
