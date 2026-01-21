'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { createOrder, getOrder } from '@/lib/api/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useNotification } from '@/contexts/NotificationContext';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
  PRIORITY_LEVELS,
} from '@/constants/orderConstants';
import DesignPicker from './DesignPicker';
import type { Item, Order, OrderId, ItemId, OrderSource, PaymentStatus, ConfirmationStatus } from '@/types';

interface OrderFormProps {
  items: Item[];
  onOrderCreated: () => void;
  duplicateOrderId?: string | null;
}

interface OrderFormItem {
  itemId: string;
  designId?: number;
  quantity: number | '';
  customizationRequest: string;
}

// Format item display name with color and fabric info
const formatItemDisplayName = (item: Item): string => {
  const details: string[] = [];
  if (item.color) details.push(item.color);
  if (item.fabric) details.push(item.fabric);
  
  if (details.length > 0) {
    return `${item.name} (${details.join(', ')})`;
  }
  return item.name;
};

function OrderForm({ items, onOrderCreated, duplicateOrderId }: OrderFormProps) {
  const { formatPrice } = useCurrency();
  const { showSuccess, showError } = useNotification();
  const [orderFrom, setOrderFrom] = useState<OrderSource | ''>('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [address, setAddress] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paidAmount, setPaidAmount] = useState('');
  const [confirmationStatus, setConfirmationStatus] = useState<ConfirmationStatus>('unconfirmed');
  const [customerNotes, setCustomerNotes] = useState('');
  const [priority, setPriority] = useState(0);
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState<string | null>(null);

  // Load order data when duplicating
  useEffect(() => {
    const loadOrderForDuplication = async () => {
      if (!duplicateOrderId || items.length === 0) return;
      
      setDuplicateLoading(true);
      setError('');
      try {
        const order = await getOrder(parseInt(duplicateOrderId, 10) as OrderId);
        setDuplicatedFrom(order.orderId);
        
        // Pre-fill form with order data (except payment info which should be fresh)
        setOrderFrom(order.orderFrom || '');
        setCustomerName(order.customerName || '');
        setCustomerId(order.customerId || '');
        setAddress(order.address || '');
        setCustomerNotes(order.customerNotes || '');
        setPriority(order.priority || 0);
        
        // Reset payment info and dates for new order
        setPaymentStatus('unpaid');
        setPaidAmount('');
        setConfirmationStatus('unconfirmed');
        setOrderDate('');
        setExpectedDeliveryDate('');
        
        // Create lookup maps for efficient item matching
        const itemsByIdMap = new Map(items.map(i => [String(i._id), i]));
        const itemsByNameMap = new Map(items.map(i => [i.name.toLowerCase(), i]));
        
        // Map order items - try to match by itemId first, then by name
        const mappedItems = order.items.map(orderItem => {
          // Try to find the item by ID first
          let matchedItem = itemsByIdMap.get(String(orderItem.item));
          
          // If not found by ID, try to match by name (for cases where same item exists)
          if (!matchedItem) {
            matchedItem = itemsByNameMap.get(orderItem.name.toLowerCase());
          }
          
          return {
            itemId: matchedItem ? String(matchedItem._id) : '',
            quantity: orderItem.quantity || 1,
            customizationRequest: orderItem.customizationRequest || ''
          };
        }).filter(item => item.itemId); // Only include items that were found
        
        setOrderItems(mappedItems);
        
        if (mappedItems.length < order.items.length) {
          setError(`Note: Some items from the original order could not be found in current inventory.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError('Failed to load order for duplication: ' + errorMessage);
      } finally {
        setDuplicateLoading(false);
      }
    };
    
    loadOrderForDuplication();
  }, [duplicateOrderId, items]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { itemId: '', designId: undefined, quantity: 1, customizationRequest: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderFormItem, value: string | number | '' | undefined) => {
    const updated = [...orderItems];
    
    // If changing item selection, reset designId
    if (field === 'itemId' && value !== updated[index].itemId) {
      updated[index] = {
        ...updated[index],
        itemId: value as string,
        designId: undefined
      };
    } else if (field === 'designId') {
      updated[index] = {
        ...updated[index],
        designId: value as number | undefined
      };
    } else if (field === 'quantity') {
      updated[index] = {
        ...updated[index],
        quantity: value as number | ''
      };
    } else if (field === 'customizationRequest') {
      updated[index] = {
        ...updated[index],
        customizationRequest: value as string
      };
    }
    
    setOrderItems(updated);
  };

  const calculateTotal = (): number => {
    return orderItems.reduce((total, orderItem) => {
      const item = items.find((i) => String(i._id) === String(orderItem.itemId));
      const qty = typeof orderItem.quantity === 'number' ? orderItem.quantity : parseInt(String(orderItem.quantity), 10);
      if (item && !Number.isNaN(qty) && qty > 0) {
        return total + item.price * qty;
      }
      return total;
    }, 0);
  };

  const getMinOrderDate = (): string => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 1); // Allow backdating up to 1 year
    return today.toISOString().split('T')[0];
  };

  const getMinDeliveryDate = (): string => {
    return new Date().toISOString().split('T')[0]; // Today or future dates only
  };

  const resetForm = () => {
    setOrderFrom('');
    setCustomerName('');
    setCustomerId('');
    setAddress('');
    setOrderDate('');
    setExpectedDeliveryDate('');
    setPaymentStatus('unpaid');
    setPaidAmount('');
    setConfirmationStatus('unconfirmed');
    setCustomerNotes('');
    setPriority(0);
    setOrderItems([]);
    setDuplicatedFrom(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setCreatedOrder(null);

    if (!orderFrom || !customerName.trim() || !customerId.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    const hasEmptyItems = orderItems.some((item) => !item.itemId || (typeof item.quantity === 'number' ? item.quantity < 1 : true));
    if (hasEmptyItems) {
      setError('Please select an item and quantity for all items');
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder({
        orderFrom,
        customerName: customerName.trim(),
        customerId: customerId.trim(),
        address: address.trim(),
        items: orderItems.map(item => {
          const selectedItem = items.find(i => String(i._id) === String(item.itemId));
          if (!selectedItem) {
            throw new Error(`Item with ID ${item.itemId} not found`);
          }
          return {
            itemId: Number.parseInt(item.itemId, 10),
            name: selectedItem.name,
            price: selectedItem.price,
            designId: item.designId,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            customizationRequest: item.customizationRequest || ''
          };
        }),
        orderDate: orderDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        paymentStatus,
        paidAmount: paidAmount ? Number.parseFloat(paidAmount) : 0,
        confirmationStatus,
        customerNotes: customerNotes.trim(),
        priority,
      });
      setCreatedOrder(order);
      resetForm();
      onOrderCreated();
      showSuccess(`Order ${order.orderId} created successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDuplicate = () => {
    resetForm();
    onOrderCreated(); // This will clear the duplicateOrderId in parent
  };

  const handleOrderFromChange = (e: SelectChangeEvent<string>) => {
    setOrderFrom(e.target.value as OrderSource);
  };

  const handlePaymentStatusChange = (e: SelectChangeEvent<string>) => {
    setPaymentStatus(e.target.value as PaymentStatus);
  };

  const handleConfirmationStatusChange = (e: SelectChangeEvent<string>) => {
    setConfirmationStatus(e.target.value as ConfirmationStatus);
  };

  const handlePriorityChange = (e: SelectChangeEvent<string>) => {
    setPriority(Number.parseInt(e.target.value, 10));
  };

  const estimatedTotal = calculateTotal();

  if (duplicateLoading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box display="flex" flexDirection="column" alignItems="center" py={4} gap={2}>
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Preparing order for duplication...
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        {duplicatedFrom ? `Duplicate Order (from ${duplicatedFrom})` : 'Create Order'}
      </Typography>

      <Collapse in={!!duplicatedFrom}>
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleCancelDuplicate}>
              Cancel
            </Button>
          }
        >
          <strong>📋 Duplicating order {duplicatedFrom}</strong> — 
          Review the pre-filled details and make any changes before creating the new order.
        </Alert>
      </Collapse>

      <Collapse in={!!createdOrder}>
        <Alert 
          severity="success" 
          icon={<CheckCircleIcon />}
          sx={{ mb: 3 }}
        >
          <AlertTitle>Order Created Successfully!</AlertTitle>
          <Typography variant="body2">
            <strong>Order ID:</strong> {createdOrder?.orderId}
          </Typography>
          <Typography variant="body2">
            <strong>Total Price:</strong> {formatPrice(createdOrder?.totalPrice || 0)}
          </Typography>
        </Alert>
      </Collapse>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth required>
              <InputLabel id="order-source-label">Order Source</InputLabel>
              <Select
                labelId="order-source-label"
                id="orderFrom"
                value={orderFrom}
                label="Order Source"
                onChange={handleOrderFromChange}
              >
                {ORDER_SOURCES.map((source) => (
                  <MenuItem key={source.value} value={source.value}>
                    {source.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              id="customerName"
              label="Customer Name"
              value={customerName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              fullWidth
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              id="customerId"
              label="Customer ID (Insta ID / Phone)"
              value={customerId}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              fullWidth
              required
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              id="address"
              label="Address"
              value={address}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
              placeholder="Enter customer address"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              id="orderDate"
              label="Order Date"
              type="date"
              value={orderDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setOrderDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: getMinOrderDate() } }}
              fullWidth
              helperText="Leave blank to use current date"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              id="expectedDeliveryDate"
              label="Expected Delivery Date"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setExpectedDeliveryDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: getMinDeliveryDate() } }}
              fullWidth
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="confirmation-status-label">Confirmation Status</InputLabel>
              <Select
                labelId="confirmation-status-label"
                id="confirmationStatus"
                value={confirmationStatus}
                label="Confirmation Status"
                onChange={handleConfirmationStatusChange}
              >
                {CONFIRMATION_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="payment-status-label">Payment Status</InputLabel>
              <Select
                labelId="payment-status-label"
                id="paymentStatus"
                value={paymentStatus}
                label="Payment Status"
                onChange={handlePaymentStatusChange}
              >
                {PAYMENT_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {paymentStatus === 'partially_paid' && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                id="paidAmount"
                label="Amount Paid"
                type="number"
                inputProps={{ min: '0', step: '0.01' }}
                value={paidAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPaidAmount(e.target.value)}
                placeholder="Enter amount paid"
                fullWidth
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel id="priority-label">Priority Level</InputLabel>
              <Select
                labelId="priority-label"
                id="priority"
                value={String(priority)}
                label="Priority Level"
                onChange={handlePriorityChange}
              >
                {PRIORITY_LEVELS.map((level) => (
                  <MenuItem key={level.value} value={level.value}>
                    {level.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              id="customerNotes"
              label="Customer Notes / Remarks"
              value={customerNotes}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomerNotes(e.target.value)}
              placeholder="Enter any notes about this customer or order"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Order Items Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Order Items
          </Typography>
          
          <Stack spacing={2}>
            {orderItems.map((orderItem, index) => {
              const selectedItem = items.find(i => String(i._id) === String(orderItem.itemId));
              const qty = typeof orderItem.quantity === 'number' ? orderItem.quantity : parseInt(String(orderItem.quantity), 10);
              const lineTotal = selectedItem && !Number.isNaN(qty) && qty > 0 ? selectedItem.price * qty : 0;
              
              return (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 5 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id={`item-${index}-label`}>Select Item</InputLabel>
                          <Select
                            labelId={`item-${index}-label`}
                            value={orderItem.itemId}
                            label="Select Item"
                            onChange={(e: SelectChangeEvent<string>) => handleItemChange(index, 'itemId', e.target.value)}
                          >
                            {items.map((item) => (
                              <MenuItem key={item._id} value={item._id}>
                                {formatItemDisplayName(item)} - {formatPrice(item.price)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 4, sm: 2 }}>
                        <TextField
                          size="small"
                          type="number"
                          label="Qty"
                          inputProps={{ min: 1 }}
                          value={orderItem.quantity}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            if (val === '') {
                              handleItemChange(index, 'quantity', '');
                            } else {
                              const parsed = parseInt(val, 10);
                              handleItemChange(index, 'quantity', Number.isNaN(parsed) ? '' : parsed);
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (Number.isNaN(val) || val < 1) {
                              handleItemChange(index, 'quantity', 1);
                            }
                          }}
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} color="primary">
                          {formatPrice(lineTotal)}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4, sm: 3 }} display="flex" justifyContent="flex-end">
                        <IconButton 
                          color="error" 
                          onClick={() => handleRemoveItem(index)}
                          aria-label="Remove item"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                    
                    {/* Item details preview when selected */}
                    {selectedItem && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                          {selectedItem.imageUrl && (
                            <Box
                              component="img"
          loading="lazy"
                              src={selectedItem.imageUrl}
                              alt={selectedItem.name}
                              sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                            />
                          )}
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {selectedItem.color && <Chip label={`Color: ${selectedItem.color}`} size="small" variant="outlined" />}
                            {selectedItem.fabric && <Chip label={`Fabric: ${selectedItem.fabric}`} size="small" variant="outlined" />}
                            {selectedItem.specialFeatures && <Chip label={selectedItem.specialFeatures} size="small" variant="outlined" />}
                          </Stack>
                        </Box>
                        
                        {/* Design Picker */}
                        {selectedItem.designs && selectedItem.designs.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <DesignPicker
                              designs={selectedItem.designs}
                              selectedDesignId={orderItem.designId}
                              onDesignSelect={(designId) => handleItemChange(index, 'designId', designId)}
                            />
                          </Box>
                        )}
                      </Box>
                    )}
                    
                    <TextField
                      size="small"
                      fullWidth
                      value={orderItem.customizationRequest}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleItemChange(index, 'customizationRequest', e.target.value)}
                      placeholder="Customization request (optional)"
                      sx={{ mt: 2 }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
          
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />} 
            onClick={handleAddItem}
            sx={{ mt: 2 }}
          >
            Add Item
          </Button>
        </Box>

        {orderItems.length > 0 && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: 'primary.50',
              border: '2px solid',
              borderColor: 'primary.200',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" color="primary.main" fontWeight={600}>
              Estimated Total: {formatPrice(estimatedTotal)}
            </Typography>
          </Paper>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          size="large"
          disabled={loading || items.length === 0}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          fullWidth
        >
          {loading ? 'Creating Order...' : 'Create Order'}
        </Button>

        {items.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Add items in the Item Management panel first
          </Alert>
        )}
      </Box>
    </Paper>
  );
}

export default OrderForm;
