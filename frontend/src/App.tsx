import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { useAuth } from './contexts/AuthContext';
import AgentListPage from './pages/AgentListPage';
import AgentCreatePage from './pages/AgentCreatePage';
import AgentDetailLayout from './pages/agent/AgentDetailLayout';
import AgentOverviewTab from './pages/agent/AgentOverviewTab';
import AgentChainsTab from './pages/agent/AgentChainsTab';
import AgentApiKeysTab from './pages/agent/AgentApiKeysTab';
import AgentFlowTab from './pages/agent/AgentFlowTab';
import AgentSettingsTab from './pages/agent/AgentSettingsTab';
import ChainCreatePage from './pages/ChainCreatePage';
import ChainDetailPage from './pages/ChainDetailPage';
import GroupsPage from './pages/GroupsPage';
import TracesPage from './pages/TracesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { Box, CircularProgress } from '@mui/material';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/agents" replace />} />
        <Route path="/agents" element={<AgentListPage />} />
        <Route path="/agents/new" element={<AgentCreatePage />} />
        <Route path="/agents/:id" element={<AgentDetailLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AgentOverviewTab />} />
          <Route path="chains" element={<AgentChainsTab />} />
          <Route path="api-keys" element={<AgentApiKeysTab />} />
          <Route path="flow" element={<AgentFlowTab />} />
          <Route path="settings" element={<AgentSettingsTab />} />
        </Route>

        {/* standalone — AgentDetailLayout 밖 */}
        <Route path="/agents/:id/chains/new" element={<ChainCreatePage />} />
        <Route path="/agents/:id/chains/:chainId" element={<ChainDetailPage />} />

        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/traces" element={<TracesPage />} />
      </Route>
    </Routes>
  );
}
