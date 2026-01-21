'use client';

import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {
  ORDER_SOURCES,
  PAYMENT_STATUSES,
  CONFIRMATION_STATUSES,
} from '@/constants/orderConstants';

interface OrderFilters {
  orderId: string;
  customerName: string;
  customerId: string;
  orderFrom: string;
  confirmationStatus: string;
  paymentStatus: string;
}

interface OrderFiltersSectionProps {
  filters: OrderFilters;
  onFilterChange: (field: keyof OrderFilters, value: string) => void;
  onClearFilters: () => void;
}

function OrderFiltersSection({ filters, onFilterChange, onClearFilters }: OrderFiltersSectionProps) {
  const handleSelectChange = (field: keyof OrderFilters) => (e: SelectChangeEvent<string>) => {
    onFilterChange(field, e.target.value);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            size="small"
            label="Search by Order ID"
            value={filters.orderId}
            onChange={(e) => onFilterChange('orderId', e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            size="small"
            label="Customer Name"
            value={filters.customerName}
            onChange={(e) => onFilterChange('customerName', e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            size="small"
            label="Customer ID"
            value={filters.customerId}
            onChange={(e) => onFilterChange('customerId', e.target.value)}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Source</InputLabel>
            <Select
              value={filters.orderFrom}
              label="Source"
              onChange={handleSelectChange('orderFrom')}
            >
              <MenuItem value="">All Sources</MenuItem>
              {ORDER_SOURCES.map(source => (
                <MenuItem key={source.value} value={source.value}>
                  {source.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.confirmationStatus}
              label="Status"
              onChange={handleSelectChange('confirmationStatus')}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {CONFIRMATION_STATUSES.map(status => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Payment</InputLabel>
            <Select
              value={filters.paymentStatus}
              label="Payment"
              onChange={handleSelectChange('paymentStatus')}
            >
              <MenuItem value="">All Payments</MenuItem>
              {PAYMENT_STATUSES.map(status => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            fullWidth
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default OrderFiltersSection;
