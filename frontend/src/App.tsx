import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import AgentListPage from './pages/AgentListPage';
import AgentCreatePage from './pages/AgentCreatePage';
import AgentDetailPage from './pages/AgentDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/agents" replace />} />
        <Route path="/agents" element={<AgentListPage />} />
        <Route path="/agents/new" element={<AgentCreatePage />} />
        <Route path="/agents/:id" element={<AgentDetailPage />} />
      </Route>
    </Routes>
  );
}
