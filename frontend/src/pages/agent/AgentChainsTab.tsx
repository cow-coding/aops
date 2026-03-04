import { useState, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Chain } from '../../types/chain';
import type { AgentDetailContext } from '../../types/agentDetail';
import { chainApi } from '../../services/chainApi';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

interface SortableChainRowProps {
  chain: Chain;
  agentId: string;
}

function SortableChainRow({ chain, agentId }: SortableChainRowProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chain.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/agents/${agentId}/chains/${chain.id}`)}
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
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? `0 8px 24px rgba(0,0,0,0.4)` : 'none',
        '&:hover': {
          borderColor: colors.border.hover,
          backgroundColor: colors.canvas.subtle,
        },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'grab',
          color: colors.fg.subtle,
          flexShrink: 0,
          '&:active': { cursor: 'grabbing' },
          '&:hover': { color: colors.fg.muted },
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 18 }} />
      </Box>
      <AccountTreeOutlinedIcon sx={{ fontSize: 18, color: colors.fg.subtle, flexShrink: 0 }} />
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
  );
}

export default function AgentChainsTab() {
  const { agent, chains, setChains } = useOutletContext<AgentDetailContext>();
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;

  const [reorderError, setReorderError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chains.findIndex((c) => c.id === active.id);
    const newIndex = chains.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(chains, oldIndex, newIndex);

    setChains(reordered);
    setReorderError(null);

    try {
      await chainApi.reorder(agent.id, reordered.map((c) => c.id));
    } catch {
      setChains(chains);
      setReorderError('Failed to save order. Please try again.');
    }
  }, [agent.id, chains, setChains]);

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

      {reorderError && (
        <Typography sx={{ color: colors.danger.fg, fontSize: '0.75rem', mb: 1 }}>
          {reorderError}
        </Typography>
      )}

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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={chains.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              {chains.map((chain) => (
                <SortableChainRow key={chain.id} chain={chain} agentId={agent.id} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
}
