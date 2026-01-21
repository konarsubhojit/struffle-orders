'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PersonIcon from '@mui/icons-material/Person';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSalesAnalyticsOptimized, ItemData, CustomerData, SourceData, RangeAnalytics } from '@/hooks';
import StatCard from '../common/StatCard';
import ProgressBarWithLabel from '../common/ProgressBarWithLabel';

interface ViewOption {
  key: string;
  label: string;
}

interface StatusFilterOption {
  key: string;
  label: string;
}

const VIEW_OPTIONS: ViewOption[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'byItem', label: 'By Item' },
  { key: 'byCustomer', label: 'By Customer' },
  { key: 'bySource', label: 'By Source' },
];

const STATUS_FILTER_OPTIONS: StatusFilterOption[] = [
  { key: 'completed', label: 'Completed Orders Only' },
  { key: 'all', label: 'All Orders' },
];

// No props needed anymore - data fetched by the hook
interface SalesReportProps {}

// Helper to get max value from array using reduce for better performance with large arrays
const getMaxValue = <T,>(items: T[], getValue: (item: T) => number): number => {
  if (items.length === 0) return 1;
  return items.reduce((max, item) => Math.max(max, getValue(item)), getValue(items[0]));
};

// Sub-component: Overview View
interface OverviewViewProps {
  currentStats: RangeAnalytics;
  analytics: Record<string, RangeAnalytics>;
  selectedRange: string;
  formatPrice: (price: number) => string;
  timeRanges: Array<{ key: string; label: string; days: number }>;
}

function OverviewView({ currentStats, analytics, selectedRange, formatPrice, timeRanges }: OverviewViewProps) {
  const topSellingItem = currentStats.topItems.length > 0 ? currentStats.topItems[0] : null;

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={formatPrice(currentStats.totalSales)} 
            label="Total Sales" 
            icon={<TrendingUpIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={currentStats.orderCount} 
            label="Total Orders" 
            icon={<ShoppingCartIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={formatPrice(currentStats.averageOrderValue)} 
            label="Avg. Order Value" 
            icon={<AttachMoneyIcon fontSize="large" />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard 
            value={currentStats.uniqueCustomers} 
            label="Unique Customers" 
            icon={<GroupIcon fontSize="large" />}
          />
        </Grid>
        {topSellingItem && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'success.50', border: '2px solid', borderColor: 'success.200' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEventsIcon sx={{ color: 'success.main', fontSize: 40 }} />
                <Typography variant="h6" fontWeight={600} color="success.dark">
                  {topSellingItem.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  🏆 Top Selling Item ({topSellingItem.quantity} units)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
        {currentStats.highestOrderingCustomer && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'info.50', border: '2px solid', borderColor: 'info.200' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ color: 'info.main', fontSize: 40 }} />
                <Typography variant="h6" fontWeight={600} color="info.dark">
                  {currentStats.highestOrderingCustomer.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  👤 Top Customer ({currentStats.highestOrderingCustomer.orderCount} orders)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Period Comparison</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Orders</TableCell>
                <TableCell align="right">Customers</TableCell>
                <TableCell align="right">Total Sales</TableCell>
                <TableCell align="right">Avg. Order Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timeRanges.map(range => (
                <TableRow 
                  key={range.key} 
                  selected={selectedRange === range.key}
                  sx={{ 
                    bgcolor: selectedRange === range.key ? 'primary.50' : 'inherit',
                  }}
                >
                  <TableCell>{range.label}</TableCell>
                  <TableCell align="right">{analytics[range.key]?.orderCount || 0}</TableCell>
                  <TableCell align="right">{analytics[range.key]?.uniqueCustomers || 0}</TableCell>
                  <TableCell align="right">{formatPrice(analytics[range.key]?.totalSales || 0)}</TableCell>
                  <TableCell align="right">{formatPrice(analytics[range.key]?.averageOrderValue || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

// Sub-component: Items View
interface ItemsViewProps {
  topItems: ItemData[];
  topItemsByRevenue: ItemData[];
  formatPrice: (price: number) => string;
}

function ItemsView({ topItems, topItemsByRevenue, formatPrice }: ItemsViewProps) {
  const maxQuantity = getMaxValue(topItems, item => item.quantity);
  const maxRevenue = getMaxValue(topItemsByRevenue, item => item.revenue);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Items by Quantity Sold</Typography>
        {topItems.length === 0 ? (
          <Typography color="text.secondary">No items sold in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {topItems.map((item, idx) => (
              <ProgressBarWithLabel
                key={item.name}
                value={item.quantity}
                maxValue={maxQuantity}
                label={`#${idx + 1} ${item.name}`}
                sublabel={formatPrice(item.revenue)}
                valueLabel={`${item.quantity} units`}
                color={idx === 0 ? 'success' : 'primary'}
                isHighlighted={idx === 0}
                emoji="🏆"
              />
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Items by Revenue</Typography>
        {topItemsByRevenue.length === 0 ? (
          <Typography color="text.secondary">No items sold in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {topItemsByRevenue.map((item, idx) => (
              <ProgressBarWithLabel
                key={item.name}
                value={item.revenue}
                maxValue={maxRevenue}
                label={`#${idx + 1} ${item.name}`}
                sublabel={`${item.quantity} units`}
                valueLabel={formatPrice(item.revenue)}
                color={idx === 0 ? 'warning' : 'secondary'}
                isHighlighted={idx === 0}
                emoji="💰"
              />
            ))}
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

// Sub-component: Customers View
interface CustomersViewProps {
  topCustomersByOrders: CustomerData[];
  topCustomersByRevenue: CustomerData[];
  formatPrice: (price: number) => string;
}

function CustomersView({ topCustomersByOrders, topCustomersByRevenue, formatPrice }: CustomersViewProps) {
  const maxOrders = getMaxValue(topCustomersByOrders, c => c.orderCount);
  const maxRevenue = getMaxValue(topCustomersByRevenue, c => c.totalSpent);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Customers by Order Count</Typography>
        {topCustomersByOrders.length === 0 ? (
          <Typography color="text.secondary">No customers in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {topCustomersByOrders.map((customer, idx) => (
              <Box key={customer.customerId}>
                <ProgressBarWithLabel
                  value={customer.orderCount}
                  maxValue={maxOrders}
                  label={`#${idx + 1} ${customer.customerName}`}
                  sublabel={formatPrice(customer.totalSpent)}
                  valueLabel={`${customer.orderCount} orders`}
                  color={idx === 0 ? 'info' : 'primary'}
                  height={16}
                  isHighlighted={idx === 0}
                  emoji="👤"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {customer.customerId}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="h6" gutterBottom>Top Customers by Revenue</Typography>
        {topCustomersByRevenue.length === 0 ? (
          <Typography color="text.secondary">No customers in this period</Typography>
        ) : (
          <Stack spacing={2}>
            {topCustomersByRevenue.map((customer, idx) => (
              <Box key={customer.customerId}>
                <ProgressBarWithLabel
                  value={customer.totalSpent}
                  maxValue={maxRevenue}
                  label={`#${idx + 1} ${customer.customerName}`}
                  sublabel={`${customer.orderCount} orders`}
                  valueLabel={formatPrice(customer.totalSpent)}
                  color={idx === 0 ? 'warning' : 'secondary'}
                  height={16}
                  isHighlighted={idx === 0}
                  emoji="💰"
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {customer.customerId}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

// Sub-component: Source View
interface SourceViewProps {
  sourceBreakdown: Record<string, SourceData>;
  formatPrice: (price: number) => string;
}

function SourceView({ sourceBreakdown, formatPrice }: SourceViewProps) {
  const sources = Object.entries(sourceBreakdown).sort((a, b) => b[1].count - a[1].count);
  const maxCount = sources.length > 0 ? Math.max(...sources.map(([, data]) => data.count)) : 1;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Orders by Source</Typography>
      {sources.length === 0 ? (
        <Typography color="text.secondary">No orders in this period</Typography>
      ) : (
        <Stack spacing={2}>
          {sources.map(([source, data]) => (
            <ProgressBarWithLabel
              key={source}
              value={data.count}
              maxValue={maxCount}
              label={source}
              sublabel={formatPrice(data.revenue)}
              valueLabel={`${data.count} orders`}
              color="primary"
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

// Main Component
function SalesReport() {
  const { formatPrice } = useCurrency();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [selectedRange, setSelectedRange] = useState('month');
  const [selectedView, setSelectedView] = useState('overview');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'completed' | 'all'>('completed');

  const { analytics, getStatsForRange, timeRanges, loading, error } = useSalesAnalyticsOptimized(selectedStatusFilter);
  const currentStats = getStatsForRange(selectedRange);

  const handleRangeChange = (e: SelectChangeEvent<string>) => {
    setSelectedRange(e.target.value);
  };

  const handleStatusFilterChange = (e: SelectChangeEvent<string>) => {
    setSelectedStatusFilter(e.target.value as 'completed' | 'all');
  };

  const handleViewChange = (e: SelectChangeEvent<string>) => {
    setSelectedView(e.target.value);
  };

  // Show loading state
  if (loading) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
          Sales Report & Analytics
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  // Show error state
  if (error) {
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
          Sales Report & Analytics
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
        Sales Report & Analytics
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
          {isMobile ? (
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedRange}
                label="Time Range"
                onChange={handleRangeChange}
              >
                {timeRanges.map(range => (
                  <MenuItem key={range.key} value={range.key}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <ButtonGroup variant="outlined" size="small">
              {timeRanges.map(range => (
                <Button
                  key={range.key}
                  variant={selectedRange === range.key ? 'contained' : 'outlined'}
                  onClick={() => setSelectedRange(range.key)}
                >
                  {range.label}
                </Button>
              ))}
            </ButtonGroup>
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Order Status</InputLabel>
              <Select 
                labelId="status-filter-label"
                id="statusFilter"
                value={selectedStatusFilter} 
                label="Order Status"
                onChange={handleStatusFilterChange}
              >
                {STATUS_FILTER_OPTIONS.map(option => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="view-select-label">View</InputLabel>
              <Select 
                labelId="view-select-label"
                id="viewSelect"
                value={selectedView} 
                label="View"
                onChange={handleViewChange}
              >
                {VIEW_OPTIONS.map(option => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      {selectedView === 'overview' && (
        <OverviewView 
          currentStats={currentStats} 
          analytics={analytics} 
          selectedRange={selectedRange}
          formatPrice={formatPrice}
          timeRanges={timeRanges}
        />
      )}
      {selectedView === 'byItem' && (
        <ItemsView 
          topItems={currentStats.topItems}
          topItemsByRevenue={currentStats.topItemsByRevenue}
          formatPrice={formatPrice}
        />
      )}
      {selectedView === 'byCustomer' && (
        <CustomersView 
          topCustomersByOrders={currentStats.topCustomersByOrders}
          topCustomersByRevenue={currentStats.topCustomersByRevenue}
          formatPrice={formatPrice}
        />
      )}
      {selectedView === 'bySource' && (
        <SourceView 
          sourceBreakdown={currentStats.sourceBreakdown}
          formatPrice={formatPrice}
        />
      )}
    </Paper>
  );
}

export default SalesReport;
