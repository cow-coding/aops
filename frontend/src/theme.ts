import { createTheme, alpha } from '@mui/material/styles';

// ============================================================
// AgentOps Linear + Terminal Dark/Light Theme
// ============================================================

// --- Dark Color Tokens ---
export const colors = {
  canvas: {
    default: '#0A0A0A',
    overlay: '#1C1C1C',
    inset: '#050505',
    subtle: '#171717',
    elevated: '#232323',
  },
  fg: {
    default: '#F0F0F0',
    muted: '#9E9E9E',
    subtle: '#787878',
    onEmphasis: '#FFFFFF',
  },
  border: {
    default: '#333333',
    muted: '#2A2A2A',
    subtle: '#1C1C1C',
    focus: '#5E6AD2',
    hover: '#404040',
  },
  accent: {
    fg: '#8B92E8',
    emphasis: '#5E6AD2',
    muted: '#5E6AD233',
    subtle: '#5E6AD21A',
  },
  success: {
    fg: '#4ADE80',
    emphasis: '#16A34A',
    muted: '#16A34A33',
    subtle: '#16A34A1A',
  },
  attention: {
    fg: '#FBBF24',
    emphasis: '#D97706',
    muted: '#D9770633',
    subtle: '#D977061A',
  },
  danger: {
    fg: '#F87171',
    emphasis: '#DC2626',
    muted: '#DC262633',
    subtle: '#DC26261A',
  },
  neutral: {
    emphasis: '#555555',
    muted: '#33333366',
    subtle: '#3333331A',
  },
  terminal: {
    green: '#4ADE80',
    blue: '#60A5FA',
    purple: '#C084FC',
    yellow: '#FDE68A',
  },
} as const;

// --- Light Color Tokens ---
export const lightColors = {
  canvas: {
    default: '#FFFFFF',
    overlay: '#FAFAFA',
    inset: '#F3F4F6',
    subtle: '#F7F7F8',
    elevated: '#EFEFEF',
  },
  fg: {
    default: '#0F0F0F',
    muted: '#5C5C5C',
    subtle: '#999999',
    onEmphasis: '#FFFFFF',
  },
  border: {
    default: '#E2E2E2',
    muted: '#EBEBEB',
    subtle: '#F3F3F3',
    focus: '#5E6AD2',
    hover: '#C4C4C4',
  },
  accent: {
    fg: '#4C54C0',
    emphasis: '#5E6AD2',
    muted: '#5E6AD233',
    subtle: '#5E6AD20F',
  },
  success: {
    fg: '#16A34A',
    emphasis: '#15803D',
    muted: '#16A34A22',
    subtle: '#16A34A0F',
  },
  attention: {
    fg: '#D97706',
    emphasis: '#B45309',
    muted: '#D9770622',
    subtle: '#D977060F',
  },
  danger: {
    fg: '#DC2626',
    emphasis: '#B91C1C',
    muted: '#DC262622',
    subtle: '#DC26260F',
  },
  neutral: {
    emphasis: '#777777',
    muted: '#88888833',
    subtle: '#8888881A',
  },
  terminal: {
    green: '#16A34A',
    blue: '#2563EB',
    purple: '#7C3AED',
    yellow: '#B45309',
  },
} as const;

export interface ColorTokens {
  canvas: { default: string; overlay: string; inset: string; subtle: string; elevated: string };
  fg: { default: string; muted: string; subtle: string; onEmphasis: string };
  border: { default: string; muted: string; subtle: string; focus: string; hover: string };
  accent: { fg: string; emphasis: string; muted: string; subtle: string };
  success: { fg: string; emphasis: string; muted: string; subtle: string };
  attention: { fg: string; emphasis: string; muted: string; subtle: string };
  danger: { fg: string; emphasis: string; muted: string; subtle: string };
  neutral: { emphasis: string; muted: string; subtle: string };
  terminal: { green: string; blue: string; purple: string; yellow: string };
}

// --- MUI Theme Augmentation ---
declare module '@mui/material/styles' {
  interface Theme {
    colors: ColorTokens;
  }
  interface ThemeOptions {
    colors?: ColorTokens;
  }
}

// --- Font Families ---
const fontFamily = [
  '"Inter"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'sans-serif',
].join(',');

export const monoFontFamily = [
  '"JetBrains Mono"',
  '"Fira Code"',
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'monospace',
].join(',');

// --- buildTheme ---
export function buildTheme(mode: 'dark' | 'light') {
  const c = mode === 'dark' ? colors : lightColors;

  return createTheme({
    colors: c,

    palette: {
      mode,
      primary: {
        main: c.accent.emphasis,
        light: c.accent.fg,
        dark: '#4A54C0',
        contrastText: c.fg.onEmphasis,
      },
      secondary: {
        main: c.neutral.emphasis,
        light: c.fg.muted,
        dark: mode === 'dark' ? '#333333' : '#AAAAAA',
        contrastText: c.fg.onEmphasis,
      },
      error: {
        main: c.danger.fg,
        dark: c.danger.emphasis,
      },
      warning: {
        main: c.attention.fg,
        dark: c.attention.emphasis,
      },
      success: {
        main: c.success.fg,
        dark: c.success.emphasis,
      },
      info: {
        main: c.accent.fg,
      },
      background: {
        default: c.canvas.default,
        paper: c.canvas.subtle,
      },
      text: {
        primary: c.fg.default,
        secondary: c.fg.muted,
        disabled: c.fg.subtle,
      },
      divider: c.border.muted,
      action: {
        active: c.fg.muted,
        hover: alpha(c.fg.default, 0.05),
        selected: alpha(c.accent.fg, 0.12),
        disabled: c.fg.subtle,
        disabledBackground: alpha(c.fg.subtle, 0.1),
      },
    },

    typography: {
      fontFamily,
      fontSize: 13,
      h1: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: '-0.03em',
        color: c.fg.default,
      },
      h2: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.025em',
        color: c.fg.default,
      },
      h3: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        color: c.fg.default,
      },
      h4: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        lineHeight: 1.5,
        color: c.fg.default,
      },
      body1: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        color: c.fg.default,
      },
      body2: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
        color: c.fg.muted,
      },
      caption: {
        fontSize: '0.6875rem',
        lineHeight: 1.5,
        color: c.fg.subtle,
      },
      button: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        textTransform: 'none' as const,
        letterSpacing: '-0.01em',
      },
      overline: {
        fontFamily: monoFontFamily,
        fontSize: '0.75rem',
        lineHeight: 1.5,
        letterSpacing: 0,
        textTransform: 'none' as const,
      },
    },

    shape: {
      borderRadius: 6,
    },

    spacing: 8,

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: c.canvas.default,
            color: c.fg.default,
            scrollbarColor: `${c.neutral.muted} transparent`,
            '&::-webkit-scrollbar': { width: 8, height: 8 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: c.neutral.muted,
              borderRadius: 4,
            },
          },
        },
      },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '4px 12px',
            fontSize: '0.8125rem',
            fontWeight: 500,
            lineHeight: '20px',
            minHeight: 30,
            letterSpacing: '-0.01em',
            '&.Mui-disabled': {
              cursor: 'not-allowed',
              pointerEvents: 'auto',
            },
          },
          contained: {
            '&.MuiButton-containedPrimary': {
              backgroundColor: c.accent.emphasis,
              color: c.fg.onEmphasis,
              border: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              '&:hover': { backgroundColor: '#6872E0' },
            },
            '&.MuiButton-containedPrimary.Mui-disabled': {
              backgroundColor: c.accent.emphasis,
              color: '#FFFFFF',
              opacity: 0.28,
              boxShadow: 'none',
            },
          },
          outlined: {
            borderColor: c.border.default,
            backgroundColor: 'transparent',
            color: c.fg.default,
            '&:hover': {
              backgroundColor: c.canvas.elevated,
              borderColor: c.border.default,
            },
            '&.Mui-disabled': {
              borderColor: 'currentColor',
              opacity: 0.28,
            },
          },
          text: {
            color: c.accent.fg,
            '&:hover': { backgroundColor: alpha(c.accent.fg, 0.08) },
          },
          sizeSmall: { padding: '3px 10px', fontSize: '0.75rem', minHeight: 26 },
          sizeLarge: { padding: '8px 18px', fontSize: '0.875rem', minHeight: 38 },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            color: c.fg.muted,
            borderRadius: 6,
            '&:hover': {
              color: c.fg.default,
              backgroundColor: alpha(c.fg.default, 0.06),
            },
          },
        },
      },

      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            backgroundColor: c.canvas.subtle,
            borderColor: c.border.muted,
            borderRadius: 8,
            backgroundImage: 'none',
            transition: 'border-color 0.15s ease',
            '&:hover': { borderColor: c.border.hover },
          },
        },
      },

      MuiCardContent: {
        styleOverrides: {
          root: { padding: 16, '&:last-child': { paddingBottom: 16 } },
        },
      },

      MuiPaper: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            backgroundColor: c.canvas.subtle,
            borderColor: c.border.muted,
            backgroundImage: 'none',
            borderRadius: 8,
            transition: 'border-color 0.15s ease',
          },
          outlined: { borderColor: c.border.muted },
        },
      },

      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: c.canvas.inset,
            borderRadius: 6,
            fontSize: '0.8125rem',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: c.border.default },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.fg.subtle },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: c.accent.emphasis,
              borderWidth: 1,
              boxShadow: `0 0 0 3px ${c.accent.subtle}`,
            },
          },
          input: {
            padding: '7px 12px',
            color: c.fg.default,
            '&::placeholder': { color: c.fg.subtle, opacity: 1 },
          },
        },
      },

      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: c.fg.default,
            '&.Mui-focused': { color: c.fg.default },
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: { fontSize: '0.6875rem', color: c.fg.muted, marginTop: 4 },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 4, fontSize: '0.6875rem', fontWeight: 500, height: 22 },
          filled: {
            backgroundColor: c.accent.subtle,
            color: c.accent.fg,
            '&:hover': { backgroundColor: c.accent.muted },
          },
          outlined: { borderColor: c.border.default, color: c.fg.muted },
        },
      },

      MuiTableContainer: {
        styleOverrides: {
          root: { borderRadius: 8, border: `1px solid ${c.border.default}` },
        },
      },

      MuiTableHead: {
        styleOverrides: { root: { backgroundColor: c.canvas.subtle } },
      },

      MuiTableCell: {
        styleOverrides: {
          root: { borderBottomColor: c.border.default, padding: '8px 16px', fontSize: '0.8125rem' },
          head: { fontWeight: 600, color: c.fg.default, backgroundColor: c.canvas.subtle },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: alpha(c.fg.default, 0.04) } },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: c.canvas.overlay, borderColor: c.border.default, borderRadius: 12 },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: { fontSize: '0.875rem', fontWeight: 600, padding: '16px 16px 0' },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundColor: c.canvas.default, borderBottom: `1px solid ${c.border.muted}` },
        },
      },

      MuiToolbar: {
        styleOverrides: {
          root: { minHeight: '40px !important', padding: '0 16px !important' },
        },
      },

      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40 },
          indicator: { backgroundColor: c.accent.emphasis, height: 2, borderRadius: '2px 2px 0 0' },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 400,
            minHeight: 40,
            padding: '8px 16px',
            color: c.fg.muted,
            '&.Mui-selected': { color: c.fg.default, fontWeight: 600 },
            '&:hover': { color: c.fg.default },
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: c.canvas.overlay,
            color: c.fg.default,
            border: `1px solid ${c.border.default}`,
            fontSize: '0.6875rem',
            borderRadius: 6,
            padding: '4px 8px',
            maxWidth: 240,
            textAlign: 'center',
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: c.canvas.overlay,
            borderColor: c.border.default,
            borderRadius: 8,
            marginTop: 4,
            boxShadow: mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.12)',
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.8125rem',
            padding: '6px 12px',
            borderRadius: 4,
            margin: '0 4px',
            '&:hover': { backgroundColor: c.accent.subtle },
            '&.Mui-selected': {
              backgroundColor: c.accent.subtle,
              '&:hover': { backgroundColor: c.accent.muted },
            },
          },
        },
      },

      MuiSkeleton: {
        styleOverrides: { root: { backgroundColor: c.border.muted } },
      },

      MuiDivider: {
        styleOverrides: { root: { borderColor: c.border.muted } },
      },

      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 6, fontSize: '0.8125rem', border: '1px solid' },
          standardError: {
            backgroundColor: c.danger.subtle,
            borderColor: c.danger.muted,
            color: c.danger.fg,
          },
          standardWarning: {
            backgroundColor: c.attention.subtle,
            borderColor: c.attention.muted,
            color: c.attention.fg,
          },
          standardSuccess: {
            backgroundColor: c.success.subtle,
            borderColor: c.success.muted,
            color: c.success.fg,
          },
          standardInfo: {
            backgroundColor: c.accent.subtle,
            borderColor: c.accent.muted,
            color: c.accent.fg,
          },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4, backgroundColor: c.neutral.subtle, height: 6 },
        },
      },
    },
  });
}

export default buildTheme('dark');
