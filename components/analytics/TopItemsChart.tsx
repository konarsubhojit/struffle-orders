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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTopItems, type AnalyticsFilters } from '@/hooks/queries/useAdvancedAnalyticsQueries';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TopItemsChartProps {
  /** Initial start date filter */
  initialStartDate?: string;
  /** Initial end date filter */
  initialEndDate?: string;
  /** Whether to show internal date filters (false if parent controls dates) */
  showDateFilters?: boolean;
  /** External filters passed from parent */
  externalFilters?: AnalyticsFilters;
  /** Maximum number of items to display */
  limit?: number;
}

/**
 * Horizontal bar component for visualizing item revenue
 */
interface HorizontalBarProps {
  value: number;
  maxValue: number;
  color?: string;
  label: string;
}

function HorizontalBar({ value, maxValue, color = '#1976d2', label }: HorizontalBarProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: 24,
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={label}
      >
        <Box
          sx={{
            height: '100%',
            width: `${percentage}%`,
            bgcolor: color,
            borderRadius: 1,
            transition: 'width 0.3s ease',
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Top Items Chart component showing top selling items by revenue
 * Includes horizontal bar chart and detailed table
 */
function TopItemsChart({
  initialStartDate,
  initialEndDate,
  showDateFilters = true,
  externalFilters,
  limit = 10,
}: TopItemsChartProps) {
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

  const { data, isLoading, error } = useTopItems(filters);

  // Get top items by revenue, limited to specified count
  const topItemsByRevenue = useMemo(() => {
    if (!data?.byRevenue) return [];
    return data.byRevenue.slice(0, limit);
  }, [data?.byRevenue, limit]);

  // Get max revenue for bar scaling
  const maxRevenue = useMemo(() => {
    if (topItemsByRevenue.length === 0) return 1;
    return Math.max(...topItemsByRevenue.map(item => item.revenue || 0));
  }, [topItemsByRevenue]);

  /**
   * Returns medal icon for top 3 items
   */
  const getRankDisplay = (rank: number) => {
    if (rank === 1) {
      return (
        <Chip 
          icon={<EmojiEventsIcon />} 
          label="1st" 
          size="small" 
          sx={{ bgcolor: '#FFD700', color: 'black', fontWeight: 700 }}
        />
      );
    }
    if (rank === 2) {
      return (
        <Chip 
          icon={<EmojiEventsIcon />} 
          label="2nd" 
          size="small" 
          sx={{ bgcolor: '#C0C0C0', color: 'black', fontWeight: 700 }}
        />
      );
    }
    if (rank === 3) {
      return (
        <Chip 
          icon={<EmojiEventsIcon />} 
          label="3rd" 
          size="small" 
          sx={{ bgcolor: '#CD7F32', color: 'white', fontWeight: 700 }}
        />
      );
    }
    return (
      <Chip label={`#${rank}`} size="small" variant="outlined" />
    );
  };

  /**
   * Returns bar color based on rank
   */
  const getBarColor = (index: number): string => {
    const colors = [
      '#FFD700', // Gold
      '#C0C0C0', // Silver
      '#CD7F32', // Bronze
      '#4caf50', // Green
      '#2196f3', // Blue
      '#9c27b0', // Purple
      '#ff9800', // Orange
      '#00bcd4', // Cyan
      '#e91e63', // Pink
      '#607d8b', // Blue Grey
    ];
    return colors[index] || '#1976d2';
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
        role="status"
        aria-label="Loading top items"
      >
        <CircularProgress aria-hidden="true" />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading top items...
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
        Failed to load top items: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box component="section" aria-labelledby="top-items-heading">
      <Typography 
        id="top-items-heading" 
        variant="h5" 
        component="h2" 
        gutterBottom
        sx={{ mb: 3 }}
      >
        Top Selling Items
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
            InputLabelProps={{ shrink: true }}
            size="small"
            inputProps={{
              'aria-label': 'Filter by start date',
            }}
          />
          <TextField
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            inputProps={{
              'aria-label': 'Filter by end date',
            }}
          />
        </Box>
      )}

      {topItemsByRevenue.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No sales data available for the selected period
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Horizontal Bar Chart */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" component="h3" gutterBottom id="bar-chart-heading">
                Revenue by Item
              </Typography>
              <Box 
                component="ul" 
                sx={{ listStyle: 'none', p: 0, m: 0 }}
                aria-labelledby="bar-chart-heading"
              >
                {topItemsByRevenue.map((item, index) => (
                  <Box
                    component="li"
                    key={`${item.name}-${index}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      py: 1,
                      borderBottom: index < topItemsByRevenue.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ minWidth: 50 }}>
                      {getRankDisplay(index + 1)}
                    </Box>
                    <Box sx={{ minWidth: 120, maxWidth: 180 }}>
                      <Typography 
                        variant="body2" 
                        fontWeight={500}
                        sx={{ 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap' 
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <HorizontalBar
                        value={item.revenue || 0}
                        maxValue={maxRevenue}
                        color={getBarColor(index)}
                        label={`${item.name}: ${formatPrice(item.revenue || 0)}`}
                      />
                    </Box>
                    <Box sx={{ minWidth: 80, textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight={600}>
                        {formatPrice(item.revenue || 0)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Detailed Table */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper variant="outlined">
              <Typography 
                variant="h6" 
                component="h3" 
                sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
                id="items-table-heading"
              >
                Detailed Breakdown
              </Typography>
              <TableContainer>
                <Table 
                  size="small"
                  aria-labelledby="items-table-heading"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell scope="col">Rank</TableCell>
                      <TableCell scope="col">Item Name</TableCell>
                      <TableCell scope="col" align="right">Qty Sold</TableCell>
                      <TableCell scope="col" align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topItemsByRevenue.map((item, index) => (
                      <TableRow 
                        key={`${item.name}-${index}`}
                        sx={{
                          '&:hover': { bgcolor: 'action.hover' },
                          ...(index < 3 && { bgcolor: 'success.50' }),
                        }}
                      >
                        <TableCell>
                          {getRankDisplay(index + 1)}
                        </TableCell>
                        <TableCell component="th" scope="row">
                          {item.name}
                        </TableCell>
                        <TableCell align="right">
                          {item.quantity?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatPrice(item.revenue || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default TopItemsChart;
