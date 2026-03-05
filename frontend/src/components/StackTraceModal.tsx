import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import { runsApi } from '../services/runsApi';
import { monoFontFamily } from '../theme';

interface StackTraceModalProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  agentName?: string;
  errorMessage?: string;
  errorType?: string;
}

export default function StackTraceModal({
  open,
  onClose,
  runId,
  agentName,
  errorMessage,
  errorType,
}: StackTraceModalProps) {
  const theme = useTheme();
  const colors = theme.colors;

  const [traceback, setTraceback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open || traceback !== null || notFound) return;
    setLoading(true);
    runsApi.getRunError(runId)
      .then((data) => setTraceback(data.traceback))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [open, runId, traceback, notFound]);

  // Reset state when runId changes
  useEffect(() => {
    setTraceback(null);
    setNotFound(false);
    setLoading(false);
  }, [runId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{
        px: 2.5, py: 1.75,
        borderBottom: `1px solid ${colors.border.muted}`,
        display: 'flex', alignItems: 'flex-start', gap: 1,
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: errorMessage ? 0.5 : 0 }}>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: colors.fg.default }}>
              {agentName ? `${agentName} — Error` : 'Error'}
            </Typography>
            {errorType && (
              <Box sx={{
                px: 0.75, py: 0.125, borderRadius: '4px',
                background: 'rgba(248, 81, 73, 0.15)',
                border: '1px solid rgba(248, 81, 73, 0.4)',
                fontSize: '0.6875rem', fontWeight: 600, color: '#F85149',
                lineHeight: 1.4, flexShrink: 0,
              }}>
                {errorType}
              </Box>
            )}
          </Box>
          {errorMessage && (
            <Typography sx={{ fontSize: '0.8125rem', color: colors.fg.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: colors.fg.muted, flexShrink: 0, mt: -0.25 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {!loading && notFound && (
          <Box sx={{ px: 2.5, py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.875rem', color: colors.fg.subtle, fontStyle: 'italic' }}>
              No traceback available
            </Typography>
          </Box>
        )}
        {!loading && traceback && (
          <Box sx={{
            maxHeight: '60vh',
            overflow: 'auto',
            px: 2.5,
            py: 2,
            background: colors.canvas.inset ?? colors.canvas.subtle,
            borderLeft: '3px solid #F85149',
          }}>
            <Typography component="pre" sx={{
              fontFamily: monoFontFamily,
              fontSize: '0.8125rem',
              color: colors.fg.default,
              whiteSpace: 'pre',
              m: 0,
              lineHeight: 1.6,
            }}>
              {traceback}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
