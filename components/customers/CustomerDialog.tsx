'use client';

import { useState, useCallback, useEffect, type ReactElement, type FormEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/queries/useCustomersQueries';
import type { Customer, CustomerSource, CreateCustomerData, UpdateCustomerData, CustomerId } from '@/types';

const SOURCE_OPTIONS: Array<{ value: CustomerSource; label: string }> = [
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  source: CustomerSource;
  notes: string;
}

const INITIAL_FORM_DATA: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  source: 'walk-in',
  notes: '',
};

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
  mode: 'create' | 'edit';
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export default function CustomerDialog({
  open,
  onClose,
  customer,
  mode,
  onSuccess,
  onError,
}: CustomerDialogProps): ReactElement {
  const [formData, setFormData] = useState<CustomerFormData>(INITIAL_FORM_DATA);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isEditMode = mode === 'edit' && customer !== undefined;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (isEditMode && customer) {
        setFormData({
          name: customer.name,
          email: customer.email ?? '',
          phone: customer.phone ?? '',
          address: customer.address ?? '',
          source: customer.source,
          notes: customer.notes ?? '',
        });
      } else {
        setFormData(INITIAL_FORM_DATA);
      }
      setValidationError(null);
    }
  }, [open, isEditMode, customer]);

  // Generate customer ID for new customers
  const generateCustomerId = useCallback((): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `CUST-${timestamp}-${random}`;
  }, []);

  // Form field handlers
  const handleTextChange = useCallback(
    (field: keyof CustomerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === 'name') {
        setValidationError(null);
      }
    },
    []
  );

  const handleSourceChange = useCallback((e: SelectChangeEvent<CustomerSource>) => {
    setFormData((prev) => ({ ...prev, source: e.target.value as CustomerSource }));
  }, []);

  // Form validation
  const validateForm = useCallback((): boolean => {
    if (!formData.name.trim()) {
      setValidationError('Customer name is required');
      return false;
    }
    setValidationError(null);
    return true;
  }, [formData.name]);

  // Submit handler
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        if (isEditMode && customer) {
          // Update existing customer
          const updateData: UpdateCustomerData = {
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone.trim() || null,
            address: formData.address.trim() || null,
            source: formData.source,
            notes: formData.notes.trim() || null,
          };

          await updateMutation.mutateAsync({
            id: customer._id,
            data: updateData,
          });

          onSuccess?.(`Customer "${formData.name}" updated successfully.`);
        } else {
          // Create new customer
          const createData: CreateCustomerData = {
            customerId: generateCustomerId(),
            name: formData.name.trim(),
            email: formData.email.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            address: formData.address.trim() || undefined,
            source: formData.source,
            notes: formData.notes.trim() || undefined,
          };

          await createMutation.mutateAsync(createData);

          onSuccess?.(`Customer "${formData.name}" created successfully.`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save customer';
        onError?.(errorMessage);
      }
    },
    [
      formData,
      isEditMode,
      customer,
      validateForm,
      createMutation,
      updateMutation,
      generateCustomerId,
      onSuccess,
      onError,
    ]
  );

  // Dialog title based on mode
  const dialogTitle = isEditMode ? 'Edit Customer' : 'Add New Customer';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="customer-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="customer-dialog-title">{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {validationError && (
              <Alert severity="error" role="alert">
                {validationError}
              </Alert>
            )}

            <TextField
              label="Name"
              value={formData.name}
              onChange={handleTextChange('name')}
              required
              fullWidth
              autoFocus
              error={validationError !== null && !formData.name.trim()}
              helperText={!formData.name.trim() && validationError ? 'Name is required' : ''}
              disabled={isLoading}
              inputProps={{
                'aria-required': true,
                'aria-invalid': validationError !== null && !formData.name.trim(),
              }}
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleTextChange('email')}
              fullWidth
              disabled={isLoading}
              inputProps={{
                'aria-describedby': 'email-helper',
              }}
            />

            <TextField
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={handleTextChange('phone')}
              fullWidth
              disabled={isLoading}
            />

            <TextField
              label="Address"
              value={formData.address}
              onChange={handleTextChange('address')}
              fullWidth
              multiline
              rows={2}
              disabled={isLoading}
            />

            <FormControl fullWidth disabled={isLoading}>
              <InputLabel id="source-label">Source</InputLabel>
              <Select
                labelId="source-label"
                id="source-select"
                value={formData.source}
                label="Source"
                onChange={handleSourceChange}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={handleTextChange('notes')}
              fullWidth
              multiline
              rows={3}
              disabled={isLoading}
              placeholder="Internal notes about this customer..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
