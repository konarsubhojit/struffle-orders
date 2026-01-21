'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSalesTrends, type AnalyticsFilters } from '@/hooks/queries/useAdvancedAnalyticsQueries';
import { useCurrency } from '@/contexts/CurrencyContext';

type GroupByOption = 'day' | 'week' | 'month';

interface SalesTrendsProps {
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
 * Simple CSS-based line chart component
 * Displays data points as a visual trend line
 */
interface SimpleLineChartProps {
  data: ReadonlyArray<{ label: string; value: number }>;
  height?: number;
  color?: string;
  ariaLabel: string;
}

function SimpleLineChart({ data, height = 200, color = '#1976d2', ariaLabel }: Readonly<SimpleLineChartProps>) {
  if (data.length === 0) {
    return (
      <Box 
        sx={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      sx={{ height, position: 'relative' }}
    >
      {/* Y-axis labels */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 20,
          width: 60,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {maxValue.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {Math.round((maxValue + minValue) / 2).toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {minValue.toLocaleString()}
        </Typography>
      </Box>

      {/* Chart area */}
      <Box
        sx={{
          position: 'absolute',
          left: 70,
          right: 10,
          top: 10,
          bottom: 30,
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          borderLeft: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: 1,
          pb: 1,
        }}
      >
        {data.map((point) => {
          const heightPercent = ((point.value - minValue) / range) * 100;
          return (
            <Box
              key={point.label}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {/* Bar representing value */}
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 40,
                  height: `${Math.max(heightPercent, 2)}%`,
                  bgcolor: color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                title={`${point.label}: ${point.value.toLocaleString()}`}
              />
            </Box>
          );
        })}
      </Box>

      {/* X-axis labels (show subset for readability) */}
      <Box
        sx={{
          position: 'absolute',
          left: 70,
          right: 10,
          bottom: 0,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {data.length > 0 && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              {data[0].label}
            </Typography>
            {data.length > 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {data.at(-1)?.label}
              </Typography>
            )}
          </>
        )}
      </Box>

      {/* Screen reader accessible data */}
      <Box component="ul" sx={{ position: 'absolute', left: -9999 }}>
        {data.map((point) => (
          <li key={point.label}>{point.label}: {point.value.toLocaleString()}</li>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Sales Trends component showing revenue, orders, and average order value over time
 * Includes visual charts and comparison metrics
 */
function SalesTrends({
  initialStartDate,
  initialEndDate,
  showDateFilters = true,
  externalFilters,
}: Readonly<SalesTrendsProps>) {
  const { formatPrice } = useCurrency();
  
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [groupBy, setGroupBy] = useState<GroupByOption>('day');

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

  const { data, isLoading, error } = useSalesTrends(filters);

  const handleGroupByChange = (event: SelectChangeEvent) => {
    setGroupBy(event.target.value as GroupByOption);
  };

  /**
   * Aggregate daily data based on groupBy selection
   */
  const aggregatedData = useMemo(() => {
    if (!data?.daily) return [];

    const daily = data.daily;

    if (groupBy === 'day') {
      return daily.map(d => ({
        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: d.date,
        revenue: d.revenue,
        orders: d.orders,
        averageOrderValue: d.averageOrderValue,
      }));
    }

    // Group by week or month
    const grouped: Record<string, { revenue: number; orders: number; count: number }> = {};

    daily.forEach(d => {
      const date = new Date(d.date);
      let key: string;

      if (groupBy === 'week') {
        // Get start of week (Sunday)
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else {
        // Group by month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { revenue: 0, orders: 0, count: 0 };
      }
      grouped[key].revenue += d.revenue;
      grouped[key].orders += d.orders;
      grouped[key].count += 1;
    });

    return Object.entries(grouped).map(([key, value]) => {
      let label: string;
      if (groupBy === 'week') {
        const date = new Date(key);
        label = `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        const [year, month] = key.split('-');
        const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1);
        label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }

      return {
        label,
        date: key,
        revenue: value.revenue,
        orders: value.orders,
        averageOrderValue: value.orders > 0 ? value.revenue / value.orders : 0,
      };
    });
  }, [data?.daily, groupBy]);

  const revenueChartData = aggregatedData.map(d => ({ label: d.label, value: d.revenue }));
  const ordersChartData = aggregatedData.map(d => ({ label: d.label, value: d.orders }));
  const aovChartData = aggregatedData.map(d => ({ label: d.label, value: d.averageOrderValue }));

  const comparison = data?.comparison;

  if (isLoading) {
    return (
      <Box 
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
        role="status"
        aria-label="Loading sales trends"
      >
        <CircularProgress aria-hidden="true" />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading sales trends...
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
        Failed to load sales trends: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box component="section" aria-labelledby="sales-trends-heading">
      <Typography 
        id="sales-trends-heading" 
        variant="h5" 
        component="h2" 
        gutterBottom
        sx={{ mb: 3 }}
      >
        Sales Trends
      </Typography>

      {/* Filters */}
      <Box 
        component="fieldset" 
        sx={{ 
          border: 'none', 
          p: 0, 
          mb: 3,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <legend className="sr-only">Trend filters</legend>
        
        {showDateFilters && (
          <>
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
          </>
        )}
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="group-by-label">Group By</InputLabel>
          <Select
            labelId="group-by-label"
            id="group-by-select"
            value={groupBy}
            label="Group By"
            onChange={handleGroupByChange}
          >
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="week">Week</MenuItem>
            <MenuItem value="month">Month</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Period Comparison */}
      {comparison && (
        <Grid 
          container 
          spacing={2} 
          sx={{ mb: 4 }}
          role="region"
          aria-label="Period comparison statistics"
        >
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Revenue Change vs Previous Period
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {comparison.revenueChange >= 0 ? (
                    <TrendingUpIcon color="success" aria-hidden="true" />
                  ) : (
                    <TrendingDownIcon color="error" aria-hidden="true" />
                  )}
                  <Typography 
                    variant="h5" 
                    fontWeight={700}
                    color={comparison.revenueChange >= 0 ? 'success.main' : 'error.main'}
                  >
                    {comparison.revenueChange >= 0 ? '+' : ''}{comparison.revenueChange.toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current: {formatPrice(comparison.currentPeriod.revenue)} | 
                  Previous: {formatPrice(comparison.previousPeriod.revenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Orders Change vs Previous Period
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {comparison.ordersChange >= 0 ? (
                    <TrendingUpIcon color="success" aria-hidden="true" />
                  ) : (
                    <TrendingDownIcon color="error" aria-hidden="true" />
                  )}
                  <Typography 
                    variant="h5" 
                    fontWeight={700}
                    color={comparison.ordersChange >= 0 ? 'success.main' : 'error.main'}
                  >
                    {comparison.ordersChange >= 0 ? '+' : ''}{comparison.ordersChange.toFixed(1)}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Current: {comparison.currentPeriod.orders} orders | 
                  Previous: {comparison.previousPeriod.orders} orders
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Revenue Trend Chart */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" component="h3" gutterBottom>
          Revenue Trend
        </Typography>
        <SimpleLineChart
          data={revenueChartData}
          height={200}
          color="#4caf50"
          ariaLabel={`Revenue trend chart showing ${revenueChartData.length} data points`}
        />
      </Paper>

      {/* Orders and AOV Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Order Count Trend
            </Typography>
            <SimpleLineChart
              data={ordersChartData}
              height={180}
              color="#2196f3"
              ariaLabel={`Order count trend chart showing ${ordersChartData.length} data points`}
            />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              Average Order Value Trend
            </Typography>
            <SimpleLineChart
              data={aovChartData}
              height={180}
              color="#ff9800"
              ariaLabel={`Average order value trend chart showing ${aovChartData.length} data points`}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Chart Library Note */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
        <Typography variant="body2" color="info.dark">
          💡 <strong>Tip:</strong> For more advanced visualizations, consider integrating a chart library 
          like Recharts, Chart.js, or Nivo. The current charts provide a basic visual representation.
        </Typography>
      </Box>
    </Box>
  );
}

export default SalesTrends;
