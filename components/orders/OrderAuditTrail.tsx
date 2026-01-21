'use client';

import { type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import { useOrderAuditTrail } from '@/hooks/queries/useAuditLogsQueries';
import type { OrderId, OrderAuditEntry } from '@/types';

interface OrderAuditTrailProps {
  orderId: OrderId;
}

const ACTION_ICONS: Record<string, ReactElement> = {
  created: <AddIcon />,
  updated: <EditIcon />,
  status_changed: <LocalShippingIcon />,
  items_added: <InventoryIcon />,
  items_removed: <DeleteIcon />,
  payment_updated: <AttachMoneyIcon />,
  completed: <CheckCircleIcon />,
  cancelled: <CancelIcon />,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'success.main',
  updated: 'info.main',
  status_changed: 'primary.main',
  items_added: 'info.main',
  items_removed: 'warning.main',
  payment_updated: 'info.main',
  completed: 'success.main',
  cancelled: 'error.main',
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Order Created',
  updated: 'Order Updated',
  status_changed: 'Status Changed',
  items_added: 'Items Added',
  items_removed: 'Items Removed',
  payment_updated: 'Payment Updated',
  completed: 'Order Completed',
  cancelled: 'Order Cancelled',
};

const FIELD_LABELS: Record<string, string> = {
  customerName: 'Customer Name',
  customerPhone: 'Customer Phone',
  totalAmount: 'Total Amount',
  advancePayment: 'Advance Payment',
  deliveryDate: 'Delivery Date',
  notes: 'Notes',
  status: 'Status',
};

/**
 * Format a date to a relative time string (e.g., "2 hours ago", "Yesterday")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Format a date to a readable datetime string
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get change description from an audit entry
 */
function getChangeDescription(entry: OrderAuditEntry): string | null {
  if (entry.fieldName && entry.oldValue && entry.newValue) {
    const fieldLabel = FIELD_LABELS[entry.fieldName] || entry.fieldName;
    return `${fieldLabel}: ${entry.oldValue} → ${entry.newValue}`;
  } else if (entry.fieldName && entry.newValue) {
    const fieldLabel = FIELD_LABELS[entry.fieldName] || entry.fieldName;
    return `${fieldLabel} set to ${entry.newValue}`;
  } else if (entry.fieldName) {
    const fieldLabel = FIELD_LABELS[entry.fieldName] || entry.fieldName;
    return `${fieldLabel} changed`;
  }
  return null;
}

/**
 * Custom Timeline Item component using Box-based layout
 */
interface TimelineItemProps {
  entry: OrderAuditEntry;
  isLast: boolean;
}

function TimelineItemComponent({ entry, isLast }: TimelineItemProps): ReactElement {
  const actionColor = ACTION_COLORS[entry.action] || 'grey.500';
  const actionIcon = ACTION_ICONS[entry.action] || <EditIcon />;
  const changeDescription = getChangeDescription(entry);

  return (
    <Box sx={{ display: 'flex', position: 'relative' }}>
      {/* Timeline connector line */}
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: 19,
            top: 40,
            bottom: -8,
            width: 2,
            bgcolor: 'divider',
          }}
        />
      )}

      {/* Timeline dot */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: actionColor,
          color: 'white',
          flexShrink: 0,
          zIndex: 1,
          fontSize: 20,
          '& .MuiSvgIcon-root': {
            fontSize: 'inherit',
          },
        }}
      >
        {actionIcon}
      </Box>

      {/* Content */}
      <Box sx={{ ml: 2, pb: 3, flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" component="span">
              {ACTION_LABELS[entry.action] || entry.action}
            </Typography>

            {/* User info */}
            {(entry.userName || entry.userEmail) && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {entry.userName || entry.userEmail}
                </Typography>
              </Stack>
            )}
          </Box>

          {/* Timestamp */}
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {formatRelativeTime(new Date(entry.createdAt))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(new Date(entry.createdAt))}
            </Typography>
          </Box>
        </Stack>

        {/* Change description */}
        {changeDescription && (
          <Chip
            label={changeDescription}
            size="small"
            variant="outlined"
            sx={{ mt: 1, fontSize: '0.75rem', height: 24 }}
          />
        )}

        {/* Notes */}
        {entry.notes && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, fontStyle: 'italic' }}
          >
            &ldquo;{entry.notes}&rdquo;
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function OrderAuditTrail({ orderId }: OrderAuditTrailProps): ReactElement {
  const { data: auditTrail, isLoading, error } = useOrderAuditTrail(orderId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load audit trail: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  if (!auditTrail || auditTrail.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary" textAlign="center">
          No audit history available for this order.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" component="h3" gutterBottom>
        Order History
      </Typography>

      <Box sx={{ mt: 2 }}>
        {auditTrail.map((entry, index) => (
          <TimelineItemComponent
            key={entry._id}
            entry={entry}
            isLast={index === auditTrail.length - 1}
          />
        ))}
      </Box>
    </Paper>
  );
}
