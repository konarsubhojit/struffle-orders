'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PercentIcon from '@mui/icons-material/Percent';
import { useProfitAnalytics, type AnalyticsFilters } from '@/hooks/queries/useAdvancedAnalyticsQueries';
import { useCurrency } from '@/contexts/CurrencyContext';
import StatCard from '../common/StatCard';

interface ProfitAnalyticsProps {
  /** Initial start date filter */
  initialStartDate?: string;
  /** Initial end date filter */
  initialEndDate?: string;
  /** Whether to show internal date filters (false if parent controls dates) */
  showDateFilters?: boolean;
  /** External filters passed from parent */
  externalFilters?: AnalyticsFilters;
}

/**
 * Profit Analytics component displaying revenue, cost, profit, and margin analysis
 * Includes summary cards and detailed breakdown by item
 */
function ProfitAnalytics({
  initialStartDate,
  initialEndDate,
  showDateFilters = true,
  externalFilters,
}: Readonly<ProfitAnalyticsProps>) {
  const { formatPrice } = useCurrency();
  
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');

  // Use external filters if provided, otherwise use local state
  const filters: AnalyticsFilters = useMemo(() => {
    if (externalFilters) {
      return externalFilters;
    }
    return {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
  }, [externalFilters, startDate, endDate]);

  const { data, isLoading, error } = useProfitAnalytics(filters);

  /**
   * Returns color based on margin percentage
   * High margin (>30%): green
   * Medium margin (15-30%): default
   * Low margin (0-15%): warning
   * Negative margin: red
   */
  const getMarginColor = (margin: number): 'success' | 'warning' | 'error' | 'default' => {
    if (margin < 0) return 'error';
    if (margin < 15) return 'warning';
    if (margin >= 30) return 'success';
    return 'default';
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
        role="status"
        aria-label="Loading profit analytics"
      >
        <CircularProgress aria-hidden="true" />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading profit analytics...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        role="alert"
        sx={{ mb: 2 }}
      >
        Failed to load profit analytics: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  const summary = data?.summary;
  const byItem = data?.byItem || [];

  return (
    <Box component="section" aria-labelledby="profit-analytics-heading">
      <Typography 
        id="profit-analytics-heading" 
        variant="h5" 
        component="h2" 
        gutterBottom
        sx={{ mb: 3 }}
      >
        Profit Analysis
      </Typography>

      {/* Date Range Filters */}
      {showDateFilters && (
        <Box 
          component="fieldset" 
          sx={{ 
            border: 'none', 
            p: 0, 
            mb: 3,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <legend className="sr-only">Date range filters</legend>
          <TextField
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { 'aria-label': 'Filter by start date' },
            }}
            size="small"
          />
          <TextField
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { 'aria-label': 'Filter by end date' },
            }}
            size="small"
          />
        </Box>
      )}

      {/* Summary Cards */}
      <Grid 
        container 
        spacing={2} 
        sx={{ mb: 4 }}
        role="region"
        aria-label="Profit summary statistics"
      >
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            value={formatPrice(summary?.totalRevenue || 0)}
            label="Total Revenue"
            icon={<AttachMoneyIcon fontSize="large" aria-hidden="true" />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            value={formatPrice(summary?.totalCost || 0)}
            label="Total Cost"
            icon={<ReceiptIcon fontSize="large" aria-hidden="true" />}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            value={formatPrice(summary?.grossProfit || 0)}
            label="Gross Profit"
            icon={
              (summary?.grossProfit || 0) >= 0 ? (
                <TrendingUpIcon fontSize="large" aria-hidden="true" />
              ) : (
                <TrendingDownIcon fontSize="large" aria-hidden="true" />
              )
            }
            color={(summary?.grossProfit || 0) >= 0 ? 'success' : 'error'}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard
            value={`${(summary?.profitMargin || 0).toFixed(1)}%`}
            label="Profit Margin"
            icon={<PercentIcon fontSize="large" aria-hidden="true" />}
            color={getMarginColor(summary?.profitMargin || 0) === 'default' ? 'primary' : getMarginColor(summary?.profitMargin || 0)}
          />
        </Grid>
      </Grid>

      {/* Breakdown by Item */}
      <Typography 
        variant="h6" 
        component="h3" 
        gutterBottom
        id="profit-by-item-heading"
      >
        Profit Breakdown by Item
      </Typography>
      
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ mb: 3 }}
      >
        <Table 
          size="small"
          aria-labelledby="profit-by-item-heading"
        >
          <TableHead>
            <TableRow>
              <TableCell scope="col">Item Name</TableCell>
              <TableCell scope="col" align="right">Revenue</TableCell>
              <TableCell scope="col" align="right">Cost</TableCell>
              <TableCell scope="col" align="right">Profit</TableCell>
              <TableCell scope="col" align="right">Margin %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byItem.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No profit data available for the selected period
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              byItem.map((item) => (
                <TableRow 
                  key={item.itemId}
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <TableCell component="th" scope="row">
                    {item.itemName}
                  </TableCell>
                  <TableCell align="right">
                    {formatPrice(item.revenue)}
                  </TableCell>
                  <TableCell align="right">
                    {formatPrice(item.cost)}
                  </TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: item.profit >= 0 ? 'success.main' : 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    {item.profit >= 0 ? '+' : ''}{formatPrice(item.profit)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${item.margin.toFixed(1)}%`}
                      size="small"
                      color={getMarginColor(item.margin)}
                      sx={{ minWidth: 60 }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Margin Legend */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}
        role="note"
        aria-label="Margin color legend"
      >
        <Typography variant="caption" color="text.secondary">
          Margin Legend:
        </Typography>
        <Chip label="≥30% High" size="small" color="success" />
        <Chip label="15-30% Medium" size="small" color="default" />
        <Chip label="0-15% Low" size="small" color="warning" />
        <Chip label="&lt;0% Negative" size="small" color="error" />
      </Box>
    </Box>
  );
}

export default ProfitAnalytics;
