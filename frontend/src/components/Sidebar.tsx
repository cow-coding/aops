import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Divider, Switch, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useColorMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, active, disabled, onClick }: NavItemProps) {
  const theme = useTheme();
  const colors = theme.colors;

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: '6px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: active ? colors.accent.fg : disabled ? colors.fg.subtle : colors.fg.muted,
        backgroundColor: active ? colors.accent.subtle : 'transparent',
        borderLeft: active ? `2px solid ${colors.accent.emphasis}` : '2px solid transparent',
        transition: 'background-color 0.1s ease, color 0.1s ease',
        '&:hover': disabled
          ? {}
          : {
              backgroundColor: active ? colors.accent.subtle : colors.canvas.elevated,
              color: active ? colors.accent.fg : colors.fg.default,
            },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: 16 }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'inherit', lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colors = theme.colors;
  const { mode, toggle } = useColorMode();
  const { user, logout } = useAuth();

  const isAgentsActive = location.pathname.startsWith('/agents');
  const isGroupsActive = location.pathname.startsWith('/groups');
  const isTracesActive = location.pathname.startsWith('/traces');
  const isCostActive = location.pathname.startsWith('/cost');
  const isMonitoringActive = location.pathname.startsWith('/monitoring');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        backgroundColor: colors.canvas.default,
        borderRight: `1px solid ${colors.border.muted}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          mb: 0.5,
        }}
        onClick={() => navigate('/agents')}
      >
        <Typography sx={{ color: colors.accent.emphasis, fontSize: '1rem', lineHeight: 1, fontWeight: 700 }}>
          ◆
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: colors.fg.default, letterSpacing: '-0.02em' }}>
          AgentOps
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ px: 1, display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1 }}>
        <NavItem
          icon={<SmartToyOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Agents"
          active={isAgentsActive}
          onClick={() => navigate('/agents')}
        />
        <NavItem
          icon={<TimelineOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Traces"
          active={isTracesActive}
          onClick={() => navigate('/traces')}
        />
        <NavItem
          icon={<AttachMoneyOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Cost"
          active={isCostActive}
          onClick={() => navigate('/cost')}
        />

        <NavItem
          icon={<MonitorHeartOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Monitoring"
          active={isMonitoringActive}
          onClick={() => navigate('/monitoring')}
        />

        <NavItem
          icon={<GroupsOutlinedIcon sx={{ fontSize: 16 }} />}
          label="Groups"
          active={isGroupsActive}
          onClick={() => navigate('/groups')}
        />
      </Box>

      {/* Bottom section */}
      <Box>
        <Divider />

        {/* Theme toggle with MUI Switch */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 1,
            cursor: 'pointer',
            color: colors.fg.muted,
            transition: 'background-color 0.1s ease, color 0.1s ease',
            '&:hover': {
              backgroundColor: colors.canvas.elevated,
              color: colors.fg.default,
            },
          }}
          onClick={toggle}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {mode === 'dark' ? (
              <DarkModeOutlinedIcon sx={{ fontSize: 14 }} />
            ) : (
              <LightModeOutlinedIcon sx={{ fontSize: 14 }} />
            )}
            <Typography sx={{ fontSize: '0.8125rem', color: 'inherit' }}>
              {mode === 'dark' ? 'Dark' : 'Light'}
            </Typography>
          </Box>
          <Switch
            size="small"
            checked={mode === 'dark'}
            onClick={(e) => e.stopPropagation()}
            onChange={toggle}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: colors.accent.fg,
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: colors.accent.muted,
                opacity: 1,
              },
              '& .MuiSwitch-track': {
                backgroundColor: colors.border.default,
                opacity: 1,
              },
            }}
          />
        </Box>

        {/* User / Logout */}
        {user && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Email → profile page */}
              <Box
                onClick={() => navigate('/profile')}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  px: 1.5,
                  py: 1,
                  cursor: 'pointer',
                  color: colors.fg.muted,
                  transition: 'background-color 0.1s ease, color 0.1s ease',
                  '&:hover': {
                    backgroundColor: colors.canvas.elevated,
                    color: colors.fg.default,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.8125rem',
                    color: 'inherit',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </Typography>
              </Box>
              {/* Logout icon */}
              <Tooltip title="Sign out" placement="right">
                <Box
                  onClick={handleLogout}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 1.25,
                    py: 1,
                    flexShrink: 0,
                    cursor: 'pointer',
                    color: colors.fg.muted,
                    transition: 'background-color 0.1s ease, color 0.1s ease',
                    '&:hover': {
                      backgroundColor: colors.canvas.elevated,
                      color: colors.danger.fg,
                    },
                  }}
                >
                  <LogoutOutlinedIcon sx={{ fontSize: 14 }} />
                </Box>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
