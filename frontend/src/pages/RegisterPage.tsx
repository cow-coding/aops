import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/AuthContext';
import { monoFontFamily } from '../theme';

export default function RegisterPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = theme.colors;
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(email, password, name);
      navigate('/agents', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim() !== '' && email.trim() !== '' && password.length >= 8;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: colors.canvas.default,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 4, justifyContent: 'center' }}>
          <Typography sx={{ color: colors.accent.emphasis, fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}>
            ◆
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '1.125rem', color: colors.fg.default, letterSpacing: '-0.02em' }}>
            AgentOps
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            border: `1px solid ${colors.border.default}`,
            borderRadius: '8px',
            p: 3,
            backgroundColor: colors.canvas.overlay,
          }}
        >
          <Typography variant="h2" sx={{ mb: 0.5 }}>
            Create an account
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Get started with AgentOps.
          </Typography>

          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <Box>
              <Typography
                component="label"
                variant="body1"
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}
              >
                Full name <span style={{ color: colors.danger.fg }}>*</span>
              </Typography>
              <TextField
                required
                fullWidth
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Box>

            <Box>
              <Typography
                component="label"
                variant="body1"
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}
              >
                Email address <span style={{ color: colors.danger.fg }}>*</span>
              </Typography>
              <TextField
                required
                fullWidth
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputProps={{
                  style: { fontFamily: monoFontFamily, fontSize: '0.8125rem' },
                }}
              />
            </Box>

            <Box>
              <Typography
                component="label"
                variant="body1"
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}
              >
                Password <span style={{ color: colors.danger.fg }}>*</span>
              </Typography>
              <TextField
                required
                fullWidth
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="At least 8 characters."
                inputProps={{
                  style: { fontFamily: monoFontFamily, fontSize: '0.8125rem' },
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={!isValid || submitting}
              sx={{ mt: 0.5 }}
            >
              {submitting ? (
                <CircularProgress size={16} sx={{ color: 'inherit' }} />
              ) : (
                'Create account'
              )}
            </Button>
          </Box>
        </Box>

        {/* Login link */}
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body1" sx={{ color: colors.fg.muted }}>
            Already have an account?{' '}
            <RouterLink
              to="/login"
              style={{ color: colors.accent.fg, textDecoration: 'none' }}
            >
              Sign in
            </RouterLink>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
