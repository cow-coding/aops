import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  /** MUI icon component or any ReactNode */
  icon?: React.ReactNode;
  /** Primary message */
  title: string;
  /** Optional secondary guidance */
  description?: string;
  /** Optional CTA */
  action?: EmptyStateAction;
  /**
   * sm  – compact, used inside fixed-height chart areas or dense lists
   * md  – default, used in card / section context
   * lg  – full page empty state
   */
  size?: 'sm' | 'md' | 'lg';
  /** Wrap the whole component in a dashed border card */
  bordered?: boolean;
}

const SIZE_CONFIG = {
  sm: { py: 3, iconBoxSize: 32, iconFontSize: 16, gap: 0.75, showDecor: false },
  md: { py: 6, iconBoxSize: 40, iconFontSize: 20, gap: 1.25, showDecor: true },
  lg: { py: 10, iconBoxSize: 52, iconFontSize: 26, gap: 1.5, showDecor: true },
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  bordered = false,
}: EmptyStateProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const cfg = SIZE_CONFIG[size];

  const inner = (
    <Box
      sx={{
        py: cfg.py,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: cfg.gap,
      }}
    >
      {/* Decorative terminal prefix — only on md/lg */}
      {cfg.showDecor && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mb: -0.5,
          }}
        >
          <Box sx={{ width: 16, height: 1, background: colors.border.muted }} />
          <Typography
            component="span"
            sx={{
              fontSize: '0.625rem',
              fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
              color: colors.border.hover,
              letterSpacing: '0.08em',
              userSelect: 'none',
            }}
          >
            {'//'}
          </Typography>
          <Box sx={{ width: 16, height: 1, background: colors.border.muted }} />
        </Box>
      )}

      {/* Icon container */}
      {icon && (
        <Box
          sx={{
            width: cfg.iconBoxSize,
            height: cfg.iconBoxSize,
            borderRadius: '10px',
            border: `1px solid ${colors.border.default}`,
            background: colors.canvas.elevated,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': {
              fontSize: `${cfg.iconFontSize}px !important`,
              color: colors.fg.subtle,
            },
          }}
        >
          {icon}
        </Box>
      )}

      {/* Text block */}
      <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: size === 'sm' ? '0.8125rem' : '0.875rem',
            fontWeight: 500,
            color: colors.fg.muted,
            lineHeight: 1.4,
          }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            sx={{
              fontSize: '0.8125rem',
              color: colors.fg.subtle,
              lineHeight: 1.5,
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Action */}
      {action && (
        <Button
          size="small"
          variant="outlined"
          onClick={action.onClick}
          startIcon={action.icon}
          sx={{
            mt: 0.5,
            fontSize: '0.8125rem',
            textTransform: 'none',
            borderColor: colors.border.default,
            color: colors.fg.muted,
            px: 2,
            '&:hover': {
              borderColor: colors.accent.emphasis,
              color: colors.accent.fg,
              background: colors.accent.subtle,
            },
          }}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );

  if (!bordered) return inner;

  return (
    <Box
      sx={{
        border: `1px dashed ${colors.border.default}`,
        borderRadius: '8px',
      }}
    >
      {inner}
    </Box>
  );
}
