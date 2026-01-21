'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import {
  ORDER_SOURCES,
  ORDER_STATUSES,
  CONFIRMATION_STATUSES,
  DELIVERY_STATUSES,
  PRIORITY_LEVELS,
} from '@/constants/orderConstants';
import {
  formatOrderDate,
  formatOrderDeliveryDate,
  getOrderStatusColor,
  getOrderPriorityColor,
} from '@/lib/utils/orderUtils';
import type { Order, OrderEditForm, PriorityData } from '@/types';

type OrderInfoData = Order | OrderEditForm;

interface OrderInfoSectionProps {
  isEditing: boolean;
  data: OrderInfoData;
  priority?: PriorityData | null;
  onDataChange?: (field: string, value: string | number) => void;
}

/**
 * Reusable order information section
 * Can display or edit order data based on mode
 */
function OrderInfoSection({ 
  isEditing, 
  data, 
  priority,
  onDataChange 
}: OrderInfoSectionProps) {
  const handleSelectChange = (field: string) => (e: SelectChangeEvent<string | number>) => {
    if (field === 'priority') {
      onDataChange?.(field, Number.parseInt(String(e.target.value), 10));
    } else {
      onDataChange?.(field, e.target.value);
    }
  };

  if (isEditing && onDataChange) {
    const editData = data as OrderEditForm;
    return (
      <Box>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Order Information
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Order Source</InputLabel>
              <Select
                value={editData.orderFrom}
                label="Order Source"
                onChange={handleSelectChange('orderFrom')}
              >
                {ORDER_SOURCES.map(source => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editData.status}
                label="Status"
                onChange={handleSelectChange('status')}
              >
                {ORDER_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Confirmation Status</InputLabel>
              <Select
                value={editData.confirmationStatus}
                label="Confirmation Status"
                onChange={handleSelectChange('confirmationStatus')}
              >
                {CONFIRMATION_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Order Date"
              type="date"
              value={editData.orderDate || ''}
              onChange={(e) => onDataChange('orderDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
              helperText="Leave blank to use current date"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Expected Delivery Date"
              type="date"
              value={editData.expectedDeliveryDate}
              onChange={(e) => onDataChange('expectedDeliveryDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Priority Level</InputLabel>
              <Select
                value={editData.priority}
                label="Priority Level"
                onChange={handleSelectChange('priority')}
              >
                {PRIORITY_LEVELS.map(level => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 3 }}>
          Delivery Tracking
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Delivery Status</InputLabel>
              <Select
                value={editData.deliveryStatus || 'not_shipped'}
                label="Delivery Status"
                onChange={handleSelectChange('deliveryStatus')}
              >
                {DELIVERY_STATUSES.map(status => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Tracking ID / AWB Number"
              value={editData.trackingId || ''}
              onChange={(e) => onDataChange('trackingId', e.target.value)}
              fullWidth
              placeholder="Enter tracking/AWB number"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Delivery Partner"
              value={editData.deliveryPartner || ''}
              onChange={(e) => onDataChange('deliveryPartner', e.target.value)}
              fullWidth
              placeholder="e.g. Delhivery, DTDC, Blue Dart"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Actual Delivery Date"
              type="date"
              value={editData.actualDeliveryDate || ''}
              onChange={(e) => onDataChange('actualDeliveryDate', e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const orderData = data as Order;

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Order Information
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Source:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip label={orderData.orderFrom} size="small" color="primary" />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Status:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip label={orderData.status || 'Pending'} size="small" color={getOrderStatusColor(orderData.status)} />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Confirmation:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={CONFIRMATION_STATUSES.find(s => s.value === orderData.confirmationStatus)?.label || 'Unconfirmed'} 
            size="small" 
            variant="outlined"
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Priority:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={PRIORITY_LEVELS.find(l => l.value === (orderData.priority || 0))?.label || 'Normal'} 
            size="small" 
            variant="outlined"
          />
        </Grid>
        {orderData.orderDate && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Order Date:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{formatOrderDate(orderData.orderDate)}</Typography>
            </Grid>
          </>
        )}
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Created:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">{formatOrderDate(orderData.createdAt)}</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Expected Delivery:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2">
            {formatOrderDeliveryDate(orderData.expectedDeliveryDate)}
            {priority && (
              <Chip 
                label={priority.label} 
                size="small" 
                color={getOrderPriorityColor(priority)}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
        Delivery Tracking
      </Typography>
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 6 }}>
          <Typography variant="body2" color="text.secondary">Delivery Status:</Typography>
        </Grid>
        <Grid size={{ xs: 6 }}>
          <Chip 
            label={DELIVERY_STATUSES.find(s => s.value === (orderData.deliveryStatus || 'not_shipped'))?.label || 'Not Shipped'} 
            size="small" 
            color={orderData.deliveryStatus === 'delivered' ? 'success' : 'default'}
          />
        </Grid>
        {orderData.trackingId && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Tracking ID:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" fontFamily="monospace">{orderData.trackingId}</Typography>
            </Grid>
          </>
        )}
        {orderData.deliveryPartner && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Delivery Partner:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{orderData.deliveryPartner}</Typography>
            </Grid>
          </>
        )}
        {orderData.actualDeliveryDate && (
          <>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2" color="text.secondary">Actual Delivery:</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="body2">{formatOrderDate(orderData.actualDeliveryDate)}</Typography>
            </Grid>
          </>
        )}
      </Grid>
    </Box>
  );
}

export default OrderInfoSection;
