'use client';

import { useState, type ReactElement, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { NAVIGATION_GROUPS, type NavigationGroup, type NavigationRoute } from '@/constants/navigation';

interface TopNavigationBarProps {
  currentRoute: string;
  onNavigate: (routeId: string) => void;
}

interface GroupMenuState {
  anchorEl: HTMLElement | null;
  groupId: string | null;
}

function TopNavigationBar({ currentRoute, onNavigate }: TopNavigationBarProps): ReactElement {
  const [menuState, setMenuState] = useState<GroupMenuState>({
    anchorEl: null,
    groupId: null,
  });

  const handleGroupClick = (event: MouseEvent<HTMLButtonElement>, groupId: string) => {
    setMenuState({
      anchorEl: event.currentTarget,
      groupId,
    });
  };

  const handleMenuClose = () => {
    setMenuState({
      anchorEl: null,
      groupId: null,
    });
  };

  const handleRouteClick = (routeId: string) => {
    onNavigate(routeId);
    handleMenuClose();
  };

  const isRouteInGroup = (group: NavigationGroup): boolean => {
    return group.routes.some((route) => route.id === currentRoute);
  };

  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {NAVIGATION_GROUPS.map((group: NavigationGroup) => {
        const isActive = isRouteInGroup(group);
        const isMenuOpen = menuState.groupId === group.id;

        return (
          <Box key={group.id}>
            <Button
              onClick={(e) => handleGroupClick(e, group.id)}
              endIcon={<ExpandMoreIcon />}
              sx={{
                color: isActive ? '#5568d3' : '#64748b',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2,
                py: 1,
                borderRadius: 1,
                position: 'relative',
                '&:hover': {
                  bgcolor: '#f0f4ff',
                  color: '#5568d3',
                },
                '&::after': isActive ? {
                  content: '""',
                  position: 'absolute',
                  bottom: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60%',
                  height: '3px',
                  bgcolor: '#5568d3',
                  borderRadius: '3px 3px 0 0',
                } : {},
              }}
            >
              {group.label}
            </Button>

            <Menu
              anchorEl={menuState.anchorEl}
              open={isMenuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              sx={{
                '& .MuiPaper-root': {
                  mt: 1,
                  minWidth: 200,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  borderRadius: 2,
                },
              }}
            >
              {group.routes.map((route: NavigationRoute) => (
                <MenuItem
                  key={route.id}
                  onClick={() => handleRouteClick(route.id)}
                  selected={currentRoute === route.id}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      bgcolor: '#f0f4ff',
                      '& .MuiListItemIcon-root': {
                        color: '#5568d3',
                      },
                      '& .MuiListItemText-primary': {
                        color: '#5568d3',
                        fontWeight: 600,
                      },
                    },
                    '&:hover': {
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {route.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={route.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                    }}
                  />
                </MenuItem>
              ))}
            </Menu>
          </Box>
        );
      })}
    </Box>
  );
}

export default TopNavigationBar;
