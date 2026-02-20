import { createTheme, alpha } from '@mui/material/styles';

// ============================================================
// AgentOps GitHub-Inspired Dark Theme
// ============================================================
// Color palette based on GitHub's dark default theme
// with custom accent colors for the AgentOps brand.

// --- Color Tokens ---
export const colors = {
  // Canvas (backgrounds)
  canvas: {
    default: '#0d1117',     // page background
    overlay: '#161b22',     // modals, dropdowns
    inset: '#010409',       // inset areas (code blocks, inputs)
    subtle: '#161b22',      // cards, secondary surfaces
  },

  // Foreground (text)
  fg: {
    default: '#e6edf3',     // primary text
    muted: '#8b949e',       // secondary text, labels
    subtle: '#6e7681',      // placeholder, disabled
    onEmphasis: '#ffffff',  // text on colored backgrounds
  },

  // Border
  border: {
    default: '#30363d',     // standard borders
    muted: '#21262d',       // subtle borders
    subtle: '#1b1f2426',    // very subtle separators
  },

  // Accent (primary brand color - blue)
  accent: {
    fg: '#58a6ff',          // links, primary actions text
    emphasis: '#1f6feb',    // primary buttons
    muted: '#388bfd66',     // hover backgrounds
    subtle: '#388bfd1a',    // tag/badge backgrounds
  },

  // Success (green)
  success: {
    fg: '#3fb950',
    emphasis: '#238636',
    muted: '#2ea04366',
    subtle: '#2ea0431a',
  },

  // Warning (orange/yellow)
  attention: {
    fg: '#d29922',
    emphasis: '#9e6a03',
    muted: '#bb800966',
    subtle: '#bb80091a',
  },

  // Danger (red)
  danger: {
    fg: '#f85149',
    emphasis: '#da3633',
    muted: '#f8514966',
    subtle: '#f851491a',
  },

  // Neutral (gray scale)
  neutral: {
    emphasis: '#6e7681',
    muted: '#6e768166',
    subtle: '#6e76811a',
  },
} as const;

// --- Typography ---
const fontFamily = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  '"Noto Sans"',
  'Helvetica',
  'Arial',
  'sans-serif',
  '"Apple Color Emoji"',
  '"Segoe UI Emoji"',
].join(',');

const monoFontFamily = [
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
].join(',');

// --- Theme ---
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.accent.emphasis,
      light: colors.accent.fg,
      dark: '#1158c7',
      contrastText: colors.fg.onEmphasis,
    },
    secondary: {
      main: colors.neutral.emphasis,
      light: colors.fg.muted,
      dark: '#484f58',
      contrastText: colors.fg.onEmphasis,
    },
    error: {
      main: colors.danger.fg,
      dark: colors.danger.emphasis,
    },
    warning: {
      main: colors.attention.fg,
      dark: colors.attention.emphasis,
    },
    success: {
      main: colors.success.fg,
      dark: colors.success.emphasis,
    },
    info: {
      main: colors.accent.fg,
    },
    background: {
      default: colors.canvas.default,
      paper: colors.canvas.subtle,
    },
    text: {
      primary: colors.fg.default,
      secondary: colors.fg.muted,
      disabled: colors.fg.subtle,
    },
    divider: colors.border.default,
    action: {
      active: colors.fg.muted,
      hover: alpha(colors.fg.default, 0.08),
      selected: alpha(colors.accent.fg, 0.16),
      disabled: colors.fg.subtle,
      disabledBackground: alpha(colors.fg.subtle, 0.12),
    },
  },

  typography: {
    fontFamily,
    fontSize: 14,
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.025em',
      color: colors.fg.default,
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      color: colors.fg.default,
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.fg.default,
    },
    h4: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: colors.fg.default,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: colors.fg.default,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: colors.fg.muted,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: colors.fg.subtle,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
      letterSpacing: 0,
    },
    // Custom variant for code/mono text
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
    // --- Global ---
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.canvas.default,
          color: colors.fg.default,
          scrollbarColor: `${colors.neutral.muted} transparent`,
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: colors.neutral.muted,
            borderRadius: 4,
          },
        },
      },
    },

    // --- Buttons ---
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '5px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: '20px',
          minHeight: 32,
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: colors.success.emphasis,
            color: colors.fg.onEmphasis,
            border: `1px solid ${alpha('#ffffff', 0.1)}`,
            '&:hover': {
              backgroundColor: '#2ea043',
            },
          },
        },
        outlined: {
          borderColor: colors.border.default,
          backgroundColor: colors.canvas.subtle,
          color: colors.fg.default,
          '&:hover': {
            backgroundColor: colors.border.muted,
            borderColor: colors.fg.subtle,
          },
        },
        text: {
          color: colors.accent.fg,
          '&:hover': {
            backgroundColor: alpha(colors.accent.fg, 0.08),
          },
        },
        sizeSmall: {
          padding: '3px 12px',
          fontSize: '0.75rem',
          minHeight: 28,
        },
        sizeLarge: {
          padding: '9px 20px',
          fontSize: '0.875rem',
          minHeight: 40,
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          color: colors.fg.muted,
          borderRadius: 6,
          '&:hover': {
            color: colors.fg.default,
            backgroundColor: alpha(colors.fg.default, 0.08),
          },
        },
      },
    },

    // --- Cards ---
    MuiCard: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          backgroundColor: colors.canvas.subtle,
          borderColor: colors.border.default,
          borderRadius: 6,
          backgroundImage: 'none',
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16,
          },
        },
      },
    },

    // --- Paper ---
    MuiPaper: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          backgroundColor: colors.canvas.subtle,
          borderColor: colors.border.default,
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: colors.border.default,
        },
      },
    },

    // --- Inputs ---
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: colors.canvas.inset,
          borderRadius: 6,
          fontSize: '0.875rem',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.border.default,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.fg.subtle,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: colors.accent.fg,
            borderWidth: 1,
            boxShadow: `0 0 0 3px ${colors.accent.subtle}`,
          },
        },
        input: {
          padding: '7px 12px',
          color: colors.fg.default,
          '&::placeholder': {
            color: colors.fg.subtle,
            opacity: 1,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: colors.fg.default,
          '&.Mui-focused': {
            color: colors.fg.default,
          },
        },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          color: colors.fg.muted,
          marginTop: 4,
        },
      },
    },

    // --- Chips / Tags ---
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontSize: '0.75rem',
          fontWeight: 500,
          height: 24,
        },
        filled: {
          backgroundColor: colors.accent.subtle,
          color: colors.accent.fg,
          '&:hover': {
            backgroundColor: colors.accent.muted,
          },
        },
        outlined: {
          borderColor: colors.border.default,
          color: colors.fg.muted,
        },
      },
    },

    // --- Tables ---
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          border: `1px solid ${colors.border.default}`,
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: colors.canvas.subtle,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: colors.border.default,
          padding: '8px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 600,
          color: colors.fg.default,
          backgroundColor: colors.canvas.subtle,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(colors.fg.default, 0.04),
          },
        },
      },
    },

    // --- Dialogs ---
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.canvas.overlay,
          borderColor: colors.border.default,
          borderRadius: 12,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          padding: '16px 16px 0',
        },
      },
    },

    // --- App Bar ---
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: colors.canvas.default,
          borderBottom: `1px solid ${colors.border.default}`,
        },
      },
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '48px !important',
          padding: '0 16px !important',
        },
      },
    },

    // --- Tabs ---
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
        },
        indicator: {
          backgroundColor: colors.danger.fg,
          height: 2,
          borderRadius: '2px 2px 0 0',
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 400,
          minHeight: 40,
          padding: '8px 16px',
          color: colors.fg.muted,
          '&.Mui-selected': {
            color: colors.fg.default,
            fontWeight: 600,
          },
          '&:hover': {
            color: colors.fg.default,
          },
        },
      },
    },

    // --- Tooltips ---
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.canvas.overlay,
          color: colors.fg.default,
          border: `1px solid ${colors.border.default}`,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '4px 8px',
        },
      },
    },

    // --- Menu ---
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.canvas.overlay,
          borderColor: colors.border.default,
          borderRadius: 12,
          marginTop: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '6px 16px',
          borderRadius: 6,
          margin: '0 8px',
          '&:hover': {
            backgroundColor: colors.accent.subtle,
          },
          '&.Mui-selected': {
            backgroundColor: colors.accent.subtle,
            '&:hover': {
              backgroundColor: colors.accent.muted,
            },
          },
        },
      },
    },

    // --- Skeleton ---
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.border.muted,
        },
      },
    },

    // --- Divider ---
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: colors.border.default,
        },
      },
    },

    // --- Alert ---
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.875rem',
          border: '1px solid',
        },
        standardError: {
          backgroundColor: colors.danger.subtle,
          borderColor: colors.danger.muted,
          color: colors.danger.fg,
        },
        standardWarning: {
          backgroundColor: colors.attention.subtle,
          borderColor: colors.attention.muted,
          color: colors.attention.fg,
        },
        standardSuccess: {
          backgroundColor: colors.success.subtle,
          borderColor: colors.success.muted,
          color: colors.success.fg,
        },
        standardInfo: {
          backgroundColor: colors.accent.subtle,
          borderColor: colors.accent.muted,
          color: colors.accent.fg,
        },
      },
    },

    // --- LinearProgress ---
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: colors.neutral.subtle,
          height: 8,
        },
      },
    },
  },
});

// Export mono font family for use in code components
export { monoFontFamily };
export default theme;
