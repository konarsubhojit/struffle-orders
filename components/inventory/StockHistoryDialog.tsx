'use client';

import { useState, useMemo, type ReactElement } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Pagination from '@mui/material/Pagination';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import HistoryIcon from '@mui/icons-material/History';
import { useStockHistory } from '@/hooks/queries/useStockQueries';
import type { ItemId, StockTransaction, StockTransactionType } from '@/types';

interface StockHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: number;
  itemName: string;
}

const TRANSACTION_TYPE_LABELS: Record<StockTransactionType, string> = {
  order_placed: 'Order Placed',
  order_cancelled: 'Order Cancelled',
  adjustment: 'Manual Adjustment',
  restock: 'Restock',
  return: 'Return',
};

const TRANSACTION_TYPE_COLORS: Record<StockTransactionType, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  order_placed: 'warning',
  order_cancelled: 'info',
  adjustment: 'default',
  restock: 'success',
  return: 'info',
};

/**
 * Format a date to a readable string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ITEMS_PER_PAGE = 10;

/**
 * Dialog showing the stock transaction history for an item
 */
export default function StockHistoryDialog({
  open,
  onClose,
  itemId,
  itemName,
}: StockHistoryDialogProps): ReactElement {
  const [page, setPage] = useState(1);

  const { 
    data: transactions, 
    isLoading, 
    isError, 
    error 
  } = useStockHistory(open ? itemId as unknown as ItemId : null);

  // Paginate transactions client-side
  const paginatedData = useMemo(() => {
    if (!transactions) return { items: [], totalPages: 0 };
    
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const items = transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    
    return { items, totalPages };
  }, [transactions, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="stock-history-dialog-title"
    >
      <DialogTitle id="stock-history-dialog-title">
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon color="primary" />
          <span>Stock History: {itemName}</span>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Loading state */}
        {isLoading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress aria-label="Loading stock history" />
          </Box>
        )}

        {/* Error state */}
        {isError && (
          <Alert severity="error">
            Failed to load stock history: {error instanceof Error ? error.message : 'Unknown error'}
          </Alert>
        )}

        {/* Empty state */}
        {!isLoading && !isError && (!transactions || transactions.length === 0) && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            minHeight={200}
            textAlign="center"
          >
            <HistoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              No stock history found for this item.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stock changes will appear here once made.
            </Typography>
          </Box>
        )}

        {/* Transactions table */}
        {!isLoading && !isError && transactions && transactions.length > 0 && (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" aria-label="Stock history table">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>
                      <Typography variant="subtitle2">Date</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Type</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2">Change</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="subtitle2">Stock Level</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Notes</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">User</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.items.map((transaction: StockTransaction) => {
                    const isPositive = transaction.quantity > 0;
                    
                    return (
                      <TableRow key={transaction.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(transaction.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={TRANSACTION_TYPE_LABELS[transaction.transactionType]}
                            color={TRANSACTION_TYPE_COLORS[transaction.transactionType]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            {isPositive ? (
                              <AddCircleIcon fontSize="small" color="success" />
                            ) : (
                              <RemoveCircleIcon fontSize="small" color="error" />
                            )}
                            <Typography 
                              variant="body2" 
                              fontWeight={600}
                              color={isPositive ? 'success.main' : 'error.main'}
                            >
                              {isPositive ? '+' : ''}{transaction.quantity}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack 
                            direction="row" 
                            spacing={1} 
                            alignItems="center" 
                            justifyContent="center"
                          >
                            <Typography variant="body2" color="text.secondary">
                              {transaction.previousStock}
                            </Typography>
                            <ArrowForwardIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={500}>
                              {transaction.newStock}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={transaction.notes ?? undefined}
                          >
                            {transaction.notes || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {transaction.userEmail || 'System'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            {paginatedData.totalPages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Pagination
                  count={paginatedData.totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  showFirstButton
                  showLastButton
                  aria-label="Stock history pagination"
                />
              </Box>
            )}

            {/* Summary */}
            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="body2" color="text.secondary">
                Total transactions: {transactions.length}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
