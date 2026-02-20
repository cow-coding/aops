import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';

export default function AppShell() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '48px',
          px: 3,
          py: 3,
          maxWidth: 1280,
          width: '100%',
          mx: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
