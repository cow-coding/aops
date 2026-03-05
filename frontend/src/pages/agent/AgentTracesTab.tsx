import { useOutletContext } from 'react-router-dom';
import type { AgentDetailContext } from '../../types/agentDetail';
import TracesPage from '../TracesPage';

export default function AgentTracesTab() {
  const { agent } = useOutletContext<AgentDetailContext>();
  return <TracesPage agentId={agent.id} showStackTrace />;
}
