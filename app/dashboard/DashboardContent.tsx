'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { signOut } from 'next-auth/react';

// Components
import NavigationDrawer from '@/components/NavigationDrawer';
import TopNavigationBar from '@/components/TopNavigationBar';
import OrderForm from '@/components/orders/OrderForm';
import OrderHistory from '@/components/orders/OrderHistory';
import BrowseItems from '@/components/items/BrowseItems';
import CreateItem from '@/components/items/CreateItem';
import ManageDeletedItems from '@/components/items/ManageDeletedItems';
import SalesReport from '@/components/analytics/SalesReport';
import FeedbackPanel from '@/components/analytics/FeedbackPanel';
import PriorityNotificationPanel from '@/components/analytics/PriorityNotificationPanel';

// Constants
import { NAVIGATION_ROUTES } from '@/constants/navigation';
import type { Item, OrderId } from '@/types';

// Hooks
import { useItems } from '@/hooks';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

export default function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isMdDown = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const { data, isLoading: itemsLoading } = useItems();
  const items: Item[] = data?.items ?? [];

  const [currentRoute, setCurrentRoute] = useState<string>(NAVIGATION_ROUTES.CREATE_ORDER);
  const [orderHistoryKey, setOrderHistoryKey] = useState<number>(0);
  const [duplicateOrderId, setDuplicateOrderId] = useState<string | null>(null);
  const [selectedOrderIdFromPriority, setSelectedOrderIdFromPriority] = useState<OrderId | null>(null);
  const [copiedItem, setCopiedItem] = useState<Item | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const handleOrderCreated = useCallback((): void => {
    setOrderHistoryKey(prev => prev + 1);
    setDuplicateOrderId(null);
    router.refresh();
  }, [router]);

  const handleDuplicateOrder = useCallback((orderId: string): void => {
    setDuplicateOrderId(orderId);
    setCurrentRoute(NAVIGATION_ROUTES.CREATE_ORDER);
  }, []);

  const handleViewOrderFromPriority = useCallback((orderId: OrderId): void => {
    setSelectedOrderIdFromPriority(orderId);
    setCurrentRoute(NAVIGATION_ROUTES.ORDER_HISTORY);
  }, []);

  const handleOrderDetailsClose = useCallback((): void => {
    setSelectedOrderIdFromPriority(null);
  }, []);

  const handleCopyItem = useCallback((item: Item): void => {
    setCopiedItem(item);
    setCurrentRoute(NAVIGATION_ROUTES.CREATE_ITEM);
  }, []);

  const handleCancelCopy = useCallback((): void => {
    setCopiedItem(null);
  }, []);

  const handleNavigate = useCallback((routeId: string): void => {
    setCurrentRoute(routeId);
    if (routeId !== NAVIGATION_ROUTES.CREATE_ORDER) {
      setDuplicateOrderId(null);
    }
    if (routeId !== NAVIGATION_ROUTES.CREATE_ITEM) {
      setCopiedItem(null);
    }
  }, []);

  const handleMobileDrawerToggle = useCallback((): void => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    await signOut({ callbackUrl: '/login' });
  }, []);

  const handleItemsChange = useCallback((): void => {
    router.refresh();
  }, [router]);

  if (itemsLoading) {
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
          Loading application...
        </Typography>
      </Box>
    );
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
                    cursor: 'default',
                    '@supports not (-webkit-background-clip: text)': {
                      color: '#5568d3',
                    },
                  }}
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
              <PriorityNotificationPanel 
                onNavigateToPriority={() => setCurrentRoute(NAVIGATION_ROUTES.ORDER_HISTORY)} 
                onViewOrder={handleViewOrderFromPriority} 
              />
              {session?.user?.image ? (
                <Avatar 
                  src={session.user.image} 
                  alt={session.user?.name || 'User'}
                  sx={{ width: 32, height: 32, border: '2px solid #e2e8f0' }}
                />
              ) : (
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#5568d3', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600 }}>
                  {(session?.user?.name || session?.user?.email || 'U')[0]?.toUpperCase() ?? 'U'}
                </Avatar>
              )}
              {!isMobile && (
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
          {/* Orders Group */}
          {currentRoute === NAVIGATION_ROUTES.CREATE_ORDER && (
            <OrderForm 
              items={items}
              onOrderCreated={handleOrderCreated}
              duplicateOrderId={duplicateOrderId}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.ORDER_HISTORY && (
            <OrderHistory 
              key={orderHistoryKey}
              onDuplicateOrder={handleDuplicateOrder}
              initialSelectedOrderId={selectedOrderIdFromPriority}
              onOrderDetailsClose={handleOrderDetailsClose}
            />
          )}
          
          {/* Items Group */}
          {currentRoute === NAVIGATION_ROUTES.BROWSE_ITEMS && (
            <BrowseItems 
              onItemsChange={handleItemsChange}
              onCopyItem={handleCopyItem}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.CREATE_ITEM && (
            <CreateItem 
              onItemCreated={handleItemsChange}
              copiedItem={copiedItem}
              onCancelCopy={handleCancelCopy}
            />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.MANAGE_DELETED_ITEMS && (
            <ManageDeletedItems onItemsChange={handleItemsChange} />
          )}
          
          {/* Analytics Group */}
          {currentRoute === NAVIGATION_ROUTES.SALES_REPORT && (
            <SalesReport />
          )}
          
          {currentRoute === NAVIGATION_ROUTES.CUSTOMER_FEEDBACK && (
            <FeedbackPanel />
          )}
        </Box>
      </Box>
    </Box>
  );
}
