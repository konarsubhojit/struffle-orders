'use client';

import { useState, useCallback, type ReactElement } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningIcon from '@mui/icons-material/Warning';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLowStockItems } from '@/hooks/queries/useStockQueries';

interface LowStockAlertProps {
  /**
   * Maximum number of items to show in the expanded list
   * @default 5
   */
  maxItems?: number;
  /**
   * Whether to show as a compact version (for sidebars)
   * @default false
   */
  compact?: boolean;
}

/**
 * Alert component showing items with low stock levels
 * Used on dashboard to notify users of inventory issues
 */
export default function LowStockAlert({ 
  maxItems = 5,
  compact = false,
}: LowStockAlertProps): ReactElement | null {
  const [expanded, setExpanded] = useState(false);
  
  const { data: lowStockItems, isLoading, isError } = useLowStockItems();

  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width={150} height={24} />
          <Skeleton variant="rectangular" height={40} />
        </Stack>
      </Paper>
    );
  }

  // Error state - show nothing rather than an error
  if (isError) {
    return null;
  }

  // No low stock items
  if (!lowStockItems || lowStockItems.length === 0) {
    if (compact) {
      return null;
    }
    return (
      <Alert severity="success" icon={<InventoryIcon />}>
        <AlertTitle>Stock Levels OK</AlertTitle>
        All items are above their low stock thresholds.
      </Alert>
    );
  }

  const itemCount = lowStockItems.length;
  const displayItems = lowStockItems.slice(0, maxItems);
  const hasMore = itemCount > maxItems;

  // Compact version for sidebars
  if (compact) {
    return (
      <Link href="/admin" passHref style={{ textDecoration: 'none' }}>
        <Paper 
          sx={{ 
            p: 1.5, 
            cursor: 'pointer',
            bgcolor: 'warning.50',
            borderLeft: 3,
            borderColor: 'warning.main',
            '&:hover': {
              bgcolor: 'warning.100',
            },
          }}
          role="button"
          tabIndex={0}
          aria-label={`${itemCount} items with low stock. Click to view inventory.`}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Badge badgeContent={itemCount} color="warning">
              <WarningIcon color="warning" />
            </Badge>
            <Typography variant="body2" fontWeight={500}>
              Low Stock Alert
            </Typography>
          </Stack>
        </Paper>
      </Link>
    );
  }

  return (
    <Alert 
      severity="warning"
      icon={<WarningIcon />}
      action={
        <IconButton
          aria-label={expanded ? 'Collapse low stock list' : 'Expand low stock list'}
          color="inherit"
          size="small"
          onClick={handleToggleExpand}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      }
      sx={{ 
        '& .MuiAlert-message': { 
          width: '100%' 
        } 
      }}
    >
      <AlertTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <span>Low Stock Warning</span>
          <Chip 
            label={itemCount} 
            size="small" 
            color="warning"
            sx={{ fontWeight: 600 }}
          />
        </Stack>
      </AlertTitle>
      
      <Typography variant="body2" color="text.secondary">
        {itemCount} item{itemCount !== 1 ? 's' : ''} {itemCount !== 1 ? 'are' : 'is'} below the low stock threshold.
      </Typography>

      <Collapse in={expanded}>
        <Box mt={2}>
          <List dense disablePadding>
            {displayItems.map((item) => (
              <ListItem 
                key={item.itemId} 
                disablePadding
                sx={{ py: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <WarningIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={500}>
                        {item.itemName}
                      </Typography>
                      <Chip
                        label={`${item.stockQuantity}/${item.lowStockThreshold}`}
                        size="small"
                        color={item.stockQuantity === 0 ? 'error' : 'warning'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Stack>
                  }
                />
              </ListItem>
            ))}
          </List>

          {hasMore && (
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              ...and {itemCount - maxItems} more item{itemCount - maxItems !== 1 ? 's' : ''}
            </Typography>
          )}

          <Box mt={2}>
            <Button
              component={Link}
              href="/admin"
              size="small"
              variant="outlined"
              color="warning"
              endIcon={<ArrowForwardIcon />}
            >
              Manage Inventory
            </Button>
          </Box>
        </Box>
      </Collapse>
    </Alert>
  );
}
