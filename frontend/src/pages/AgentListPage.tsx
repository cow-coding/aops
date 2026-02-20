import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { Agent } from '../types/agent';
import { agentApi } from '../services/agentApi';
import { colors } from '../theme';

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

export default function AgentListPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    agentApi
      .list()
      .then(setAgents)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? '').toLowerCase().includes(search.toLowerCase()),
  );

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
        <Typography color="error">Failed to load agents: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Agents</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/agents/new')}
        >
          New agent
        </Button>
      </Box>

      {agents.length === 0 ? (
        /* Empty state */
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
          }}
        >
          <SmartToyOutlinedIcon sx={{ fontSize: 64, color: colors.fg.subtle, mb: 2 }} />
          <Typography sx={{ fontSize: '1.25rem', mb: 1 }}>No agents found</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create your first agent to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/agents/new')}
          >
            Create an agent
          </Button>
        </Box>
      ) : (
        <>
          {/* Search bar */}
          <Box sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <TextField
              placeholder="Find an agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: colors.fg.subtle, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Agent list */}
          <Box>
            {filtered.map((agent) => (
              <Box key={agent.id}>
                <Box
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  sx={{
                    py: 2,
                    px: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      color: colors.accent.fg,
                      mb: 0.5,
                    }}
                  >
                    {agent.name}
                  </Typography>
                  {agent.description && (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 1,
                      }}
                    >
                      {agent.description}
                    </Typography>
                  )}
                  <Typography variant="caption">
                    Updated {timeAgo(agent.updated_at)}
                  </Typography>
                </Box>
                <Divider />
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
