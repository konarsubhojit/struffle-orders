'use client';

import { useState, useMemo, useCallback, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useStockInventory, type StockFilters } from '@/hooks/queries/useStockQueries';
import PaginationControls from '@/components/common/PaginationControls';
import StockAdjustmentDialog from './StockAdjustmentDialog';
import StockHistoryDialog from './StockHistoryDialog';
import type { StockInfo, ItemId } from '@/types';

/**
 * Determine the stock status color based on current stock and threshold
 */
function getStockStatusColor(stock: number, threshold: number, trackStock: boolean): 'success' | 'warning' | 'error' | 'default' {
  if (!trackStock) {
    return 'default';
  }
  if (stock <= 0) {
    return 'error';
  }
  if (stock <= threshold) {
    return 'error';
  }
  // Close to threshold (within 20% above threshold)
  if (stock <= threshold * 1.2) {
    return 'warning';
  }
  return 'success';
}

/**
 * Get the stock status icon based on current stock and threshold
 */
function getStockStatusIcon(stock: number, threshold: number, trackStock: boolean): ReactElement | null {
  if (!trackStock) {
    return null;
  }
  const color = getStockStatusColor(stock, threshold, trackStock);
  if (color === 'error') {
    return <WarningIcon fontSize="small" color="error" />;
  }
  if (color === 'warning') {
    return <WarningIcon fontSize="small" color="warning" />;
  }
  return <CheckCircleIcon fontSize="small" color="success" />;
}

interface StockRowProps {
  stock: StockInfo;
  onAdjust: (stock: StockInfo) => void;
  onViewHistory: (stock: StockInfo) => void;
}

function StockRow({ stock, onAdjust, onViewHistory }: StockRowProps): ReactElement {
  const statusColor = getStockStatusColor(stock.stockQuantity, stock.lowStockThreshold, stock.trackStock);
  const statusIcon = getStockStatusIcon(stock.stockQuantity, stock.lowStockThreshold, stock.trackStock);

  return (
    <TableRow 
      hover
      sx={{
        bgcolor: statusColor === 'error' ? 'error.50' : 
                 statusColor === 'warning' ? 'warning.50' : 
                 'inherit',
      }}
    >
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          {statusIcon}
          <Typography variant="body2" fontWeight={500}>
            {stock.itemName}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <Chip
          label={stock.stockQuantity}
          color={statusColor}
          size="small"
          sx={{ fontWeight: 600, minWidth: 60 }}
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {stock.lowStockThreshold}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={stock.trackStock ? 'Yes' : 'No'}
          color={stock.trackStock ? 'primary' : 'default'}
          variant={stock.trackStock ? 'filled' : 'outlined'}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Adjust stock">
            <IconButton
              size="small"
              color="primary"
              onClick={() => onAdjust(stock)}
              aria-label={`Adjust stock for ${stock.itemName}`}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View history">
            <IconButton
              size="small"
              color="info"
              onClick={() => onViewHistory(stock)}
              aria-label={`View stock history for ${stock.itemName}`}
            >
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
}

/**
 * Main inventory/stock management component
 * Displays a table of items with their stock levels and provides
 * functionality to adjust stock and view history
 */
export default function StockManager(): ReactElement {
  // State for filters
  const [filters, setFilters] = useState<StockFilters>({
    page: 1,
    limit: 20,
    lowStockOnly: false,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');

  // State for dialogs
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    open: boolean;
    stock: StockInfo | null;
  }>({ open: false, stock: null });
  
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    stock: StockInfo | null;
  }>({ open: false, stock: null });

  // Fetch inventory data
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch,
    isFetching,
  } = useStockInventory(filters);

  // Handlers
  const handleToggleLowStockOnly = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      lowStockOnly: event.target.checked,
      page: 1, // Reset to first page when filter changes
    }));
  }, []);

  const handleSearch = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      search: searchInput,
      page: 1,
    }));
  }, [searchInput]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  const handleOpenAdjustment = useCallback((stock: StockInfo) => {
    setAdjustmentDialog({ open: true, stock });
  }, []);

  const handleCloseAdjustment = useCallback(() => {
    setAdjustmentDialog({ open: false, stock: null });
  }, []);

  const handleOpenHistory = useCallback((stock: StockInfo) => {
    setHistoryDialog({ open: true, stock });
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryDialog({ open: false, stock: null });
  }, []);

  // Pagination info for controls
  const paginationInfo = useMemo(() => ({
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    total: data?.pagination?.total ?? 0,
    totalPages: data?.pagination?.totalPages ?? 1,
  }), [filters.page, filters.limit, data?.pagination?.total, data?.pagination?.totalPages]);

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress aria-label="Loading inventory data" />
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load inventory: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  const items: StockInfo[] = data?.items ?? [];

  return (
    <Box>
      {/* Header */}
      <Stack 
        direction="row" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <InventoryIcon color="primary" />
          <Typography variant="h5" component="h2">
            Inventory Management
          </Typography>
        </Stack>
        <Tooltip title="Refresh inventory data">
          <IconButton 
            onClick={() => refetch()} 
            disabled={isFetching}
            aria-label="Refresh inventory"
          >
            <RefreshIcon className={isFetching ? 'rotating' : ''} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2} 
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            size="small"
            placeholder="Search items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button 
                    size="small" 
                    onClick={handleSearch}
                    disabled={isFetching}
                  >
                    Search
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
            aria-label="Search items"
          />
          <FormControlLabel
            control={
              <Switch
                checked={filters.lowStockOnly ?? false}
                onChange={handleToggleLowStockOnly}
                color="warning"
              />
            }
            label={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <WarningIcon fontSize="small" color="warning" />
                <Typography variant="body2">Low stock only</Typography>
              </Stack>
            }
          />
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table aria-label="Inventory stock table">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>
                <Typography variant="subtitle2">Item Name</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Current Stock</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Low Threshold</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Track Stock</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="subtitle2">Actions</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    {filters.lowStockOnly 
                      ? 'No items with low stock found.'
                      : 'No items found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((stock) => (
                <StockRow
                  key={stock.itemId}
                  stock={stock}
                  onAdjust={handleOpenAdjustment}
                  onViewHistory={handleOpenHistory}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {items.length > 0 && (
        <PaginationControls
          paginationData={paginationInfo}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      {/* Adjustment Dialog */}
      {adjustmentDialog.stock && (
        <StockAdjustmentDialog
          open={adjustmentDialog.open}
          onClose={handleCloseAdjustment}
          itemId={adjustmentDialog.stock.itemId as unknown as number}
          itemName={adjustmentDialog.stock.itemName}
          currentStock={adjustmentDialog.stock.stockQuantity}
        />
      )}

      {/* History Dialog */}
      {historyDialog.stock && (
        <StockHistoryDialog
          open={historyDialog.open}
          onClose={handleCloseHistory}
          itemId={historyDialog.stock.itemId as unknown as number}
          itemName={historyDialog.stock.itemName}
        />
      )}
    </Box>
  );
}
