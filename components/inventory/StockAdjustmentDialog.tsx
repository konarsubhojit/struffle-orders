'use client';

import { useState, useCallback, useEffect, useMemo, type ReactElement, type FormEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useAdjustStock } from '@/hooks/queries/useStockQueries';
import type { ItemId, StockTransactionType } from '@/types';

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: number;
  itemName: string;
  currentStock: number;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface FormData {
  quantity: string;
  notes: string;
}

const INITIAL_FORM_DATA: FormData = {
  quantity: '',
  notes: '',
};

/**
 * Dialog for adjusting stock levels for an item
 * Allows adding or removing stock with notes
 */
export default function StockAdjustmentDialog({
  open,
  onClose,
  itemId,
  itemName,
  currentStock,
  onSuccess,
  onError,
}: StockAdjustmentDialogProps): ReactElement {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mutation
  const adjustMutation = useAdjustStock();
  const isLoading = adjustMutation.isPending;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(INITIAL_FORM_DATA);
      setValidationError(null);
      adjustMutation.reset();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate preview values
  const quantityValue = useMemo(() => {
    const parsed = parseInt(formData.quantity, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [formData.quantity]);

  const afterStock = useMemo(() => {
    return currentStock + quantityValue;
  }, [currentStock, quantityValue]);

  const isAdding = quantityValue > 0;
  const isRemoving = quantityValue < 0;

  // Handlers
  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, negative sign, or numeric input
    if (value === '' || value === '-' || /^-?\d+$/.test(value)) {
      setFormData(prev => ({ ...prev, quantity: value }));
      setValidationError(null);
    }
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, notes: e.target.value }));
  }, []);

  const handleQuickAdjust = useCallback((amount: number) => {
    setFormData(prev => {
      const current = parseInt(prev.quantity, 10) || 0;
      return { ...prev, quantity: String(current + amount) };
    });
    setValidationError(null);
  }, []);

  // Validation
  const validateForm = useCallback((): boolean => {
    const quantity = parseInt(formData.quantity, 10);
    
    if (Number.isNaN(quantity) || quantity === 0) {
      setValidationError('Quantity is required and must not be zero');
      return false;
    }

    if (afterStock < 0) {
      setValidationError(`Cannot remove more than current stock (${currentStock})`);
      return false;
    }

    setValidationError(null);
    return true;
  }, [formData.quantity, afterStock, currentStock]);

  // Submit handler
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const quantity = parseInt(formData.quantity, 10);
    const transactionType: StockTransactionType = quantity > 0 ? 'restock' : 'adjustment';

    try {
      await adjustMutation.mutateAsync({
        itemId: itemId as unknown as ItemId,
        quantity: Math.abs(quantity) * (quantity > 0 ? 1 : -1),
        transactionType,
        notes: formData.notes.trim() || undefined,
      });

      const action = quantity > 0 ? 'added to' : 'removed from';
      onSuccess?.(`${Math.abs(quantity)} units ${action} "${itemName}" stock.`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to adjust stock';
      onError?.(message);
    }
  }, [validateForm, formData, itemId, itemName, adjustMutation, onSuccess, onError, onClose]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="stock-adjustment-dialog-title"
    >
      <DialogTitle id="stock-adjustment-dialog-title">
        Adjust Stock: {itemName}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* Error display */}
            {(validationError || adjustMutation.isError) && (
              <Alert severity="error">
                {validationError || (adjustMutation.error instanceof Error 
                  ? adjustMutation.error.message 
                  : 'An error occurred')}
              </Alert>
            )}

            {/* Stock preview */}
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Stock Preview
              </Typography>
              <Stack 
                direction="row" 
                spacing={2} 
                alignItems="center" 
                justifyContent="center"
              >
                <Chip
                  label={`Current: ${currentStock}`}
                  color="default"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <ArrowForwardIcon color="action" />
                <Chip
                  label={`After: ${afterStock}`}
                  color={afterStock < 0 ? 'error' : isAdding ? 'success' : isRemoving ? 'warning' : 'default'}
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
              {quantityValue !== 0 && (
                <Typography 
                  variant="body2" 
                  color={isAdding ? 'success.main' : 'warning.main'}
                  mt={1}
                >
                  {isAdding ? '+' : ''}{quantityValue} units
                </Typography>
              )}
            </Box>

            {/* Quantity input */}
            <Box>
              <TextField
                fullWidth
                label="Quantity Change"
                value={formData.quantity}
                onChange={handleQuantityChange}
                placeholder="e.g., 10 to add, -5 to remove"
                helperText="Use positive numbers to add stock, negative to remove"
                required
                error={!!validationError}
                InputProps={{
                  inputProps: {
                    'aria-describedby': 'quantity-helper-text',
                  },
                }}
              />
              
              {/* Quick adjust buttons */}
              <Stack 
                direction="row" 
                spacing={1} 
                mt={1}
                flexWrap="wrap"
                useFlexGap
              >
                <Button 
                  size="small" 
                  variant="outlined"
                  color="error"
                  startIcon={<RemoveIcon />}
                  onClick={() => handleQuickAdjust(-10)}
                  aria-label="Remove 10 units"
                >
                  -10
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  color="error"
                  startIcon={<RemoveIcon />}
                  onClick={() => handleQuickAdjust(-1)}
                  aria-label="Remove 1 unit"
                >
                  -1
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => handleQuickAdjust(1)}
                  aria-label="Add 1 unit"
                >
                  +1
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => handleQuickAdjust(10)}
                  aria-label="Add 10 units"
                >
                  +10
                </Button>
              </Stack>
            </Box>

            {/* Notes input */}
            <TextField
              fullWidth
              label="Notes (optional)"
              value={formData.notes}
              onChange={handleNotesChange}
              placeholder="Reason for adjustment..."
              multiline
              rows={2}
              inputProps={{
                'aria-label': 'Adjustment notes',
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={onClose} 
            disabled={isLoading}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || quantityValue === 0}
            color={isAdding ? 'success' : isRemoving ? 'warning' : 'primary'}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {isLoading ? 'Adjusting...' : 'Adjust Stock'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
