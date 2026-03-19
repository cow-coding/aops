import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { Agent } from '../../types/agent';
import type { Chain } from '../../types/chain';
import type { ApiKey } from '../../types/apiKey';
import type { AgentDetailContext } from '../../types/agentDetail';
import { agentApi } from '../../services/agentApi';
import { chainApi } from '../../services/chainApi';
import { apiKeyApi } from '../../services/apiKeyApi';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

interface TabLabelProps {
  label: string;
  count?: number;
}

function TabLabel({ label, count }: TabLabelProps) {
  const theme = useTheme();
  const colors = theme.colors;

  if (!count || count === 0) return <>{label}</>;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {label}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 18,
          height: 18,
          px: 0.5,
          borderRadius: '9px',
          fontSize: '0.625rem',
          fontWeight: 600,
          lineHeight: 1,
          backgroundColor: colors.neutral.muted,
          color: colors.fg.muted,
          '.Mui-selected &': {
            backgroundColor: colors.accent.subtle,
            color: colors.accent.fg,
          },
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

const TABS = ['overview', 'chains', 'stats', 'traces', 'cost', 'flow', 'api-keys', 'settings'] as const;
type TabSegment = typeof TABS[number];

export default function AgentDetailLayout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();
  const colors = theme.colors;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [chains, setChains] = useState<Chain[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([agentApi.getById(id), chainApi.list(id), apiKeyApi.list(id)])
      .then(([ag, ch, keys]) => {
        setAgent(ag);
        setChains(ch);
        setApiKeys(keys);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const tabSegment = (pathname.split('/')[3] ?? 'overview') as TabSegment;
  const activeTab: TabSegment = TABS.includes(tabSegment) ? tabSegment : 'overview';

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
        <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Agent not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/agents')} sx={{ mt: 2 }}>
          Back to Agents
        </Button>
      </Box>
    );
  }

  const outletContext: AgentDetailContext = {
    agent,
    setAgent: setAgent as unknown as React.Dispatch<React.SetStateAction<Agent>>,
    chains,
    apiKeys,
    setChains,
    setApiKeys,
  };

  // If the current path is exactly /agents/:id with no tab segment, redirect to overview
  if (!pathname.split('/')[3]) {
    return <Navigate to={`/agents/${id}/overview`} replace />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/agents')}
          sx={{ mb: 1.5, color: colors.fg.muted, '&:hover': { color: colors.fg.default } }}
        >
          Back to Agents
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <SmartToyOutlinedIcon sx={{ fontSize: 28, color: colors.fg.muted, mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h2">{agent.name}</Typography>
            {agent.description && (
              <Typography
                variant="body1"
                sx={{ color: colors.fg.muted, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {agent.description}
              </Typography>
            )}
            <Typography variant="caption" sx={{ mt: 0.25, display: 'block' }}>
              {relativeTime(agent.updated_at)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Sticky Tab Bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: colors.canvas.default,
          mx: -3,
          px: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v: TabSegment) => navigate(`/agents/${id}/${v}`)}
          sx={{
            minHeight: 40,
            borderBottom: `1px solid ${colors.border.muted}`,
            '& .MuiTabs-indicator': {
              backgroundColor: colors.accent.emphasis,
              height: 2,
              borderRadius: '2px 2px 0 0',
            },
          }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="chains" label={<TabLabel label="Chains" count={chains.length} />} />
          <Tab value="stats" label="Stats" />
          <Tab value="traces" label="Traces" />
          <Tab value="cost" label="Cost" />
          <Tab value="flow" label="Flow" />
          <Tab value="api-keys" label={<TabLabel label="API Keys" count={apiKeys.length} />} />
          <Tab value="settings" label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ pt: 3 }}>
        <Outlet context={outletContext} />
      </Box>
    </Box>
  );
}
