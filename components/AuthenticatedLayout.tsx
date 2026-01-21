'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useCallback, useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Chip,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PreviewIcon from '@mui/icons-material/Preview';
import { signOut } from 'next-auth/react';
import NavigationDrawer from '@/components/NavigationDrawer';
import TopNavigationBar from '@/components/TopNavigationBar';
import PriorityNotificationPanel from '@/components/analytics/PriorityNotificationPanel';
import { NAVIGATION_ROUTES } from '@/constants/navigation';
import type { OrderId } from '@/types';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

const ROUTE_TO_NAV_MAP: Record<string, string> = {
  '/orders/create': NAVIGATION_ROUTES.CREATE_ORDER,
  '/orders/history': NAVIGATION_ROUTES.ORDER_HISTORY,
  '/orders': NAVIGATION_ROUTES.ORDER_HISTORY,
  '/items/browse': NAVIGATION_ROUTES.BROWSE_ITEMS,
  '/items/create': NAVIGATION_ROUTES.CREATE_ITEM,
  '/items/deleted': NAVIGATION_ROUTES.MANAGE_DELETED_ITEMS,
  '/items': NAVIGATION_ROUTES.BROWSE_ITEMS,
  '/sales': NAVIGATION_ROUTES.SALES_REPORT,
  '/feedback': NAVIGATION_ROUTES.CUSTOMER_FEEDBACK,
  '/admin': NAVIGATION_ROUTES.ADMIN_PANEL,
};

const NAV_TO_ROUTE_MAP: Record<string, string> = {
  [NAVIGATION_ROUTES.CREATE_ORDER]: '/orders/create',
  [NAVIGATION_ROUTES.ORDER_HISTORY]: '/orders/history',
  [NAVIGATION_ROUTES.BROWSE_ITEMS]: '/items/browse',
  [NAVIGATION_ROUTES.CREATE_ITEM]: '/items/create',
  [NAVIGATION_ROUTES.MANAGE_DELETED_ITEMS]: '/items/deleted',
  [NAVIGATION_ROUTES.SALES_REPORT]: '/sales',
  [NAVIGATION_ROUTES.CUSTOMER_FEEDBACK]: '/feedback',
  [NAVIGATION_ROUTES.ADMIN_PANEL]: '/admin',
};

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isMdDown = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [guestMode, setGuestMode] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const currentRoute = ROUTE_TO_NAV_MAP[pathname] || NAVIGATION_ROUTES.CREATE_ORDER;

  // Check for guest mode and handle authentication in a single effect
  useEffect(() => {
    const isGuest = sessionStorage.getItem('guestMode') === 'true';
    setGuestMode(isGuest);
    setIsInitialized(true);
    
    // Only redirect if not guest and not authenticated
    if (status === 'unauthenticated' && !isGuest) {
      router.push('/login');
    }
  }, [status, router]);

  const handleNavigate = useCallback((routeId: string): void => {
    const path = NAV_TO_ROUTE_MAP[routeId];
    if (path) {
      router.push(path);
    }
  }, [router]);

  const handleMobileDrawerToggle = useCallback((): void => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    if (guestMode) {
      sessionStorage.removeItem('guestMode');
      router.push('/login');
    } else {
      await signOut({ callbackUrl: '/login' });
    }
  }, [guestMode, router]);

  const handleViewOrderFromPriority = useCallback((orderId: OrderId): void => {
    router.push(`/orders/history?orderId=${orderId}`);
  }, [router]);

  if ((status === 'loading' || !isInitialized) && !guestMode) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!session && !guestMode && isInitialized) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Drawer - Only for Mobile */}
      {isMdDown && (
        <NavigationDrawer 
          currentRoute={currentRoute} 
          onNavigate={handleNavigate}
          mobileOpen={mobileDrawerOpen}
          desktopOpen={false}
          onMobileToggle={handleMobileDrawerToggle}
        />
      )}

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          width: '100%',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <AppBar 
          position="sticky" 
          elevation={1}
          sx={{ 
            bgcolor: '#ffffff',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: { xs: 56, sm: 64 } }}>
            {/* Left Section: Branding and Navigation */}
            <Box display="flex" alignItems="center" gap={2}>
              {/* Mobile Menu Toggle */}
              {isMdDown && (
                <IconButton
                  color="inherit"
                  aria-label="toggle navigation drawer"
                  aria-expanded={mobileDrawerOpen}
                  edge="start"
                  onClick={handleMobileDrawerToggle}
                  sx={{ 
                    color: '#5568d3',
                    '&:hover': {
                      bgcolor: '#f0f4ff',
                    }
                  }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              
              {/* Branding */}
              <Tooltip title={`Version ${APP_VERSION}`} arrow>
                <Typography 
                  variant="h6" 
                  component="h1" 
                  sx={{ 
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    flexShrink: 0,
                    color: '#5568d3',
                    background: 'linear-gradient(135deg, #5568d3 0%, #667eea 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    cursor: 'pointer',
                    '@supports not (-webkit-background-clip: text)': {
                      color: '#5568d3',
                    },
                  }}
                  onClick={() => router.push('/orders/create')}
                >
                  {isMobile ? 'Kiyon' : 'Kiyon Store'}
                </Typography>
              </Tooltip>

              {/* Desktop Navigation */}
              {!isMdDown && (
                <TopNavigationBar 
                  currentRoute={currentRoute}
                  onNavigate={handleNavigate}
                />
              )}
            </Box>

            {/* Right Section: User Info and Actions */}
            <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
              {!guestMode && (
                <PriorityNotificationPanel 
                  onNavigateToPriority={() => router.push('/orders/history')} 
                  onViewOrder={handleViewOrderFromPriority} 
                />
              )}
              {guestMode && (
                <Chip 
                  icon={<PreviewIcon />} 
                  label={isMobile ? "Guest" : "Guest Mode"} 
                  size="small"
                  sx={{ 
                    bgcolor: '#f0f4ff', 
                    color: '#5568d3',
                    border: '1px solid #cbd5e1',
                    fontWeight: 500,
                    '& .MuiChip-icon': {
                      color: '#5568d3'
                    }
                  }}
                />
              )}
              {session?.user?.image && !guestMode ? (
                <Avatar 
                  src={session.user.image} 
                  alt={session.user?.name || 'User'}
                  sx={{ width: 32, height: 32, border: '2px solid #e2e8f0' }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#5568d3', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600 }}>
                  {guestMode ? 'G' : (session?.user?.name || session?.user?.email || 'U')[0]?.toUpperCase() ?? 'U'}
                </Avatar>
              )}
              {!isMobile && !guestMode && (
                <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155', fontWeight: 500 }}>
                  {session?.user?.name || session?.user?.email}
                </Typography>
              )}
              <IconButton
                onClick={handleLogout}
                size="small"
                sx={{ 
                  color: '#5568d3',
                  '&:hover': {
                    bgcolor: '#f0f4ff',
                  }
                }}
                aria-label="Sign out"
              >
                <LogoutIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box 
          sx={{ 
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 },
            maxWidth: '1200px',
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
