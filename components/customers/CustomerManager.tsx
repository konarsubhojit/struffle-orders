'use client';

import { useState, useCallback, useEffect, type ReactElement, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import { useNotification } from '@/contexts/NotificationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useCustomers, type CustomerFilters } from '@/hooks/queries/useCustomersQueries';
import PaginationControls from '@/components/common/PaginationControls';
import CustomerDialog from './CustomerDialog';
import type { Customer, CustomerSource } from '@/types';

const SOURCE_OPTIONS: Array<{ value: CustomerSource | 'all'; label: string }> = [
  { value: 'all', label: 'All Sources' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'online', label: 'Online' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const DEBOUNCE_DELAY = 300;

interface CustomerManagerProps {
  onCustomerSelect?: (customer: Customer) => void;
}

export default function CustomerManager({ onCustomerSelect }: CustomerManagerProps): ReactElement {
  const { showSuccess, showError } = useNotification();
  const { formatPrice } = useCurrency();

  // Local state for filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CustomerSource | 'all'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();

  // Build filters for query
  const filters: CustomerFilters = {
    page,
    limit,
    search: debouncedSearch || undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
  };

  // Fetch customers
  const { data, isLoading, error, refetch } = useCustomers(filters);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset to first page on search
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handlers
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSourceChange = useCallback((e: SelectChangeEvent<CustomerSource | 'all'>) => {
    setSourceFilter(e.target.value as CustomerSource | 'all');
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleRowClick = useCallback((customer: Customer) => {
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    } else {
      setSelectedCustomer(customer);
      setDialogOpen(true);
    }
  }, [onCustomerSelect]);

  const handleAddCustomer = useCallback(() => {
    setSelectedCustomer(undefined);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedCustomer(undefined);
  }, []);

  const handleDialogSuccess = useCallback((message: string) => {
    showSuccess(message);
    handleDialogClose();
    refetch();
  }, [showSuccess, handleDialogClose, refetch]);

  const handleDialogError = useCallback((message: string) => {
    showError(message);
  }, [showError]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString();
  };

  // Render loading state
  if (isLoading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress aria-label="Loading customers" />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load customers: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  const customers = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          Customer Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCustomer}
          aria-label="Add new customer"
        >
          Add Customer
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            label="Search customers"
            placeholder="Search by name, phone, or email..."
            value={searchInput}
            onChange={handleSearchChange}
            size="small"
            sx={{ flexGrow: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon aria-hidden="true" />
                </InputAdornment>
              ),
              'aria-label': 'Search customers by name, phone, or email',
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="source-filter-label">Source</InputLabel>
            <Select
              labelId="source-filter-label"
              id="source-filter"
              value={sourceFilter}
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
        </Stack>
      </Paper>

      {/* Customer Table */}
      <TableContainer component={Paper}>
        <Table aria-label="Customer list">
          <TableHead>
            <TableRow>
              <TableCell>Customer ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell align="right">Total Orders</TableCell>
              <TableCell align="right">Total Spent</TableCell>
              <TableCell>Last Order</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {debouncedSearch || sourceFilter !== 'all'
                      ? 'No customers found matching your criteria.'
                      : 'No customers yet. Click "Add Customer" to create one.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow
                  key={String(customer._id)}
                  hover
                  onClick={() => handleRowClick(customer)}
                  sx={{ cursor: 'pointer' }}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${customer.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(customer);
                    }
                  }}
                >
                  <TableCell>{customer.customerId}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {customer.name}
                    </Typography>
                    {customer.email && (
                      <Typography variant="caption" color="text.secondary">
                        {customer.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{customer.phone || '—'}</TableCell>
                  <TableCell align="right">{customer.totalOrders}</TableCell>
                  <TableCell align="right">{formatPrice(customer.totalSpent)}</TableCell>
                  <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {customers.length > 0 && (
        <PaginationControls
          paginationData={pagination}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {/* Customer Dialog */}
      <CustomerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        customer={selectedCustomer}
        mode={selectedCustomer ? 'edit' : 'create'}
        onSuccess={handleDialogSuccess}
        onError={handleDialogError}
      />
    </Box>
  );
}
