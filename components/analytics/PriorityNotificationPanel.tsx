'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { usePriorityOrders, getDaysUntilDelivery, getNotificationMessage, OrderWithPriority } from '@/hooks';
import { useNotification } from '@/contexts/NotificationContext';
import type { OrderId } from '@/types';

interface PriorityNotificationPanelProps {
  onNavigateToPriority: () => void;
  onViewOrder: (orderId: OrderId) => void;
}

// Sub-component: Notification Item
interface NotificationItemProps {
  order: OrderWithPriority;
  isCritical: boolean;
  onClick: () => void;
}

function NotificationItem({ order, isCritical, onClick }: NotificationItemProps) {
  return (
    <ListItemButton onClick={onClick}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} color="primary">
              {order.orderId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {order.customerName}
            </Typography>
          </Box>
          {isCritical ? (
            <Chip 
              icon={<WarningIcon />}
              label="Critical" 
              color="error" 
              size="small"
            />
          ) : (
            <Chip 
              icon={<PriorityHighIcon />}
              label="High" 
              color="warning" 
              size="small"
            />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {getNotificationMessage(order)}
        </Typography>
        
        {order.items && order.items.length > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </Typography>
        )}
      </Box>
    </ListItemButton>
  );
}

function PriorityNotificationPanel({ onNavigateToPriority, onViewOrder }: PriorityNotificationPanelProps) {
  const { showWarning } = useNotification();
  const [open, setOpen] = useState(false);
  const [hasShownLoginNotification, setHasShownLoginNotification] = useState(false);

  const { orders, criticalCount, loading } = usePriorityOrders({ autoRefresh: true });

  // Filter to show only most critical orders (top 10)
  const criticalOrders = orders
    .filter(order => {
      const days = getDaysUntilDelivery(order.expectedDeliveryDate);
      return (days !== null && days <= 3) || order.priority >= 5;
    })
    .slice(0, 10);

  // Show notification on first load if there are critical orders
  useEffect(() => {
    if (!hasShownLoginNotification && criticalOrders.length > 0) {
      const trueCriticalCount = criticalOrders.filter(o => {
        const days = getDaysUntilDelivery(o.expectedDeliveryDate);
        return (days !== null && days < 0) || o.priority >= 8;
      }).length;
      
      if (trueCriticalCount > 0) {
        showWarning(
          `You have ${trueCriticalCount} critical order${trueCriticalCount > 1 ? 's' : ''} requiring immediate attention.`,
          'Important Orders'
        );
      }
      setHasShownLoginNotification(true);
    }
  }, [criticalOrders, hasShownLoginNotification, showWarning]);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleOrderClick = (orderId: OrderId) => {
    setOpen(false);
    onViewOrder(orderId);
  };

  const handleViewAll = () => {
    setOpen(false);
    onNavigateToPriority();
  };

  return (
    <>
      <IconButton 
        onClick={handleToggle}
        aria-label={`${criticalOrders.length} priority notifications`}
        sx={{ color: '#5568d3' }}
      >
        <Badge 
          badgeContent={criticalOrders.length} 
          color="error"
          max={99}
        >
          <NotificationsActiveIcon />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: { 
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%'
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Priority Orders
            </Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {loading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading...</Typography>
          </Box>
        )}
        
        {!loading && criticalOrders.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No priority orders at the moment! 🎉
            </Typography>
          </Box>
        )}
        
        {!loading && criticalOrders.length > 0 && (
          <>
            {criticalCount > 0 && (
              <Paper 
                elevation={0} 
                sx={{ 
                  m: 2, 
                  p: 2, 
                  bgcolor: 'error.50',
                  border: '1px solid',
                  borderColor: 'error.200'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon color="error" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={600} color="error.dark">
                    Critical Alert
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {criticalCount} order{criticalCount > 1 ? 's' : ''} need{criticalCount === 1 ? 's' : ''} immediate attention
                </Typography>
              </Paper>
            )}

            <List sx={{ pt: 0 }}>
              {criticalOrders.map((order, index) => {
                const days = getDaysUntilDelivery(order.expectedDeliveryDate);
                const isCritical = (days !== null && days < 0) || order.priority >= 8;
                
                return (
                  <Box key={order._id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <NotificationItem
                        order={order}
                        isCritical={isCritical}
                        onClick={() => handleOrderClick(order._id)}
                      />
                    </ListItem>
                  </Box>
                );
              })}
            </List>

            <Divider />

            <Box sx={{ p: 2 }}>
              <Button 
                variant="contained" 
                fullWidth
                onClick={handleViewAll}
              >
                View All Priority Orders
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}

export default PriorityNotificationPanel;
