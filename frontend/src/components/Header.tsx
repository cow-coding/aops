import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import { colors } from '../theme';

export default function Header() {
  const navigate = useNavigate();

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => navigate('/agents')}
        >
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: colors.accent.fg,
            }}
          />
          <Typography variant="h4" component="span">
            AgentOps
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
