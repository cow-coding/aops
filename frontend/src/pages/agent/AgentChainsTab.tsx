import { useOutletContext, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { AgentDetailContext } from '../../types/agentDetail';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export default function AgentChainsTab() {
  const { agent, chains } = useOutletContext<AgentDetailContext>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h3">Chains</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate(`/agents/${agent.id}/chains/new`)}
        >
          New Chain
        </Button>
      </Box>

      {chains.length === 0 ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            onClick={() => navigate(`/agents/${agent.id}/chains/new`)}
          >
            New Chain
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
          {chains.map((chain) => (
            <Box
              key={chain.id}
              onClick={() => navigate(`/agents/${agent.id}/chains/${chain.id}`)}
              sx={{
                border: `1px solid ${colors.border.muted}`,
                borderRadius: '8px',
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': {
                  borderColor: colors.border.hover,
                  backgroundColor: colors.canvas.subtle,
                },
              }}
            >
              <AccountTreeOutlinedIcon
                sx={{ fontSize: 18, color: colors.fg.subtle, flexShrink: 0 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                  <Typography
                    sx={{
                      color: colors.accent.fg,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chain.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: colors.fg.subtle,
                      fontSize: '0.6875rem',
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
              <ChevronRightIcon sx={{ fontSize: 16, color: colors.fg.subtle, flexShrink: 0 }} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
