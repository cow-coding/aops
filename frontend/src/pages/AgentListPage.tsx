import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Agent } from '../types/agent';
import { agentApi } from '../services/agentApi';

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
  const theme = useTheme();
  const colors = theme.colors;

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
          <Box sx={{ pb: 2, mb: 2 }}>
            <TextField
              placeholder="Find an agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: colors.fg.subtle, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Agent list — card-style rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map((agent) => (
              <Box
                key={agent.id}
                onClick={() => navigate(`/agents/${agent.id}`)}
                sx={{
                  border: `1px solid ${colors.border.muted}`,
                  borderRadius: '8px',
                  px: 2,
                  py: 1.5,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  '&:hover': {
                    borderColor: colors.border.hover,
                    backgroundColor: colors.canvas.subtle,
                  },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography
                      sx={{
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        color: colors.accent.fg,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.6875rem',
                        color: colors.fg.subtle,
                        flexShrink: 0,
                        ml: 'auto',
                      }}
                    >
                      Updated {timeAgo(agent.updated_at)}
                    </Typography>
                  </Box>
                  {agent.description && (
                    <Typography
                      variant="body1"
                      sx={{
                        color: colors.fg.muted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {agent.description}
                    </Typography>
                  )}
                </Box>
                <ChevronRightIcon sx={{ fontSize: 18, color: colors.fg.subtle, flexShrink: 0 }} />
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
