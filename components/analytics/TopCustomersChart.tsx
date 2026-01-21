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
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useTopCustomers, type AnalyticsFilters } from '@/hooks/queries/useAdvancedAnalyticsQueries';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TopCustomersChartProps {
  /** Initial start date filter */
  initialStartDate?: string;
  /** Initial end date filter */
  initialEndDate?: string;
  /** Whether to show internal date filters (false if parent controls dates) */
  showDateFilters?: boolean;
  /** External filters passed from parent */
  externalFilters?: AnalyticsFilters;
  /** Maximum number of customers to display */
  limit?: number;
}

/**
 * Customer card component for top 3 customers
 */
interface TopCustomerCardProps {
  rank: number;
  name: string;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  formatPrice: (value: number) => string;
}

function TopCustomerCard({ 
  rank, 
  name, 
  orderCount, 
  totalSpent, 
  averageOrderValue,
  formatPrice,
}: TopCustomerCardProps) {
  const getBgColor = () => {
    if (rank === 1) return 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)';
    if (rank === 2) return 'linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)';
    if (rank === 3) return 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)';
    return undefined;
  };

  const getTextColor = () => {
    if (rank <= 3) return 'white';
    return 'text.primary';
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        background: getBgColor(),
        ...(rank > 3 && { bgcolor: 'background.paper' }),
      }}
    >
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ position: 'relative', display: 'inline-block', mb: 1 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: rank <= 3 ? 'rgba(255,255,255,0.3)' : 'primary.main',
              color: getTextColor(),
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </Avatar>
          {rank <= 3 && (
            <Box
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'white',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 2,
              }}
            >
              <StarIcon sx={{ color: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32', fontSize: 18 }} />
            </Box>
          )}
        </Box>
        
        <Typography 
          variant="h6" 
          fontWeight={700} 
          color={getTextColor()}
          sx={{ mb: 0.5 }}
        >
          {name}
        </Typography>
        
        <Chip 
          label={`#${rank}`} 
          size="small" 
          sx={{ 
            mb: 2,
            bgcolor: rank <= 3 ? 'rgba(255,255,255,0.3)' : 'primary.light',
            color: getTextColor(),
            fontWeight: 600,
          }} 
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color={getTextColor()}>
              {orderCount}
            </Typography>
            <Typography variant="caption" color={rank <= 3 ? 'rgba(255,255,255,0.8)' : 'text.secondary'}>
              Orders
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight={700} color={getTextColor()}>
              {formatPrice(totalSpent)}
            </Typography>
            <Typography variant="caption" color={rank <= 3 ? 'rgba(255,255,255,0.8)' : 'text.secondary'}>
              Total Spent
            </Typography>
          </Box>
        </Box>
        
        <Typography 
          variant="body2" 
          sx={{ mt: 2 }}
          color={rank <= 3 ? 'rgba(255,255,255,0.9)' : 'text.secondary'}
        >
          Avg: {formatPrice(averageOrderValue)} / order
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Top Customers Chart component showing top customers by revenue
 * Includes featured cards for top 3 and detailed table
 */
function TopCustomersChart({
  initialStartDate,
  initialEndDate,
  showDateFilters = true,
  externalFilters,
  limit = 10,
}: TopCustomersChartProps) {
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

  const { data, isLoading, error } = useTopCustomers(filters);

  // Combine customer data from different sources
  const topCustomers = useMemo(() => {
    if (!data) return [];
    
    // Prefer byRevenue if available, otherwise use byOrders
    const customers = data.byRevenue || data.byOrders || [];
    
    return customers.slice(0, limit).map((customer, index) => ({
      id: customer.customerId || `customer-${index}`,
      name: customer.customerName || 'Unknown Customer',
      orderCount: customer.orderCount || 0,
      totalSpent: customer.totalSpent || 0,
      averageOrderValue: customer.orderCount > 0 
        ? customer.totalSpent / customer.orderCount 
        : 0,
    }));
  }, [data, limit]);

  const top3Customers = topCustomers.slice(0, 3);
  const remainingCustomers = topCustomers.slice(3);

  if (isLoading) {
    return (
      <Box 
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}
        role="status"
        aria-label="Loading top customers"
      >
        <CircularProgress aria-hidden="true" />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading top customers...
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
        Failed to load top customers: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box component="section" aria-labelledby="top-customers-heading">
      <Typography 
        id="top-customers-heading" 
        variant="h5" 
        component="h2" 
        gutterBottom
        sx={{ mb: 3 }}
      >
        Top Customers
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

      {topCustomers.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            No customer data available for the selected period
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Top 3 Customer Cards */}
          <Grid 
            container 
            spacing={2} 
            sx={{ mb: 4 }}
            role="region"
            aria-label="Top 3 customers"
          >
            {top3Customers.map((customer, index) => (
              <Grid size={{ xs: 12, sm: 4 }} key={customer.id}>
                <TopCustomerCard
                  rank={index + 1}
                  name={customer.name}
                  orderCount={customer.orderCount}
                  totalSpent={customer.totalSpent}
                  averageOrderValue={customer.averageOrderValue}
                  formatPrice={formatPrice}
                />
              </Grid>
            ))}
          </Grid>

          {/* Full Customer Table */}
          <Paper variant="outlined">
            <Typography 
              variant="h6" 
              component="h3" 
              sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
              id="customers-table-heading"
            >
              All Top Customers
            </Typography>
            <TableContainer>
              <Table 
                size="small"
                aria-labelledby="customers-table-heading"
              >
                <TableHead>
                  <TableRow>
                    <TableCell scope="col" sx={{ width: 60 }}>Rank</TableCell>
                    <TableCell scope="col">Customer Name</TableCell>
                    <TableCell scope="col" align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <ShoppingCartIcon fontSize="small" aria-hidden="true" />
                        Orders
                      </Box>
                    </TableCell>
                    <TableCell scope="col" align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <AttachMoneyIcon fontSize="small" aria-hidden="true" />
                        Total Spent
                      </Box>
                    </TableCell>
                    <TableCell scope="col" align="right">Avg Order Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.map((customer, index) => (
                    <TableRow 
                      key={customer.id}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(index < 3 && { bgcolor: 'success.50' }),
                      }}
                    >
                      <TableCell>
                        <Chip 
                          label={`#${index + 1}`} 
                          size="small" 
                          color={index < 3 ? 'primary' : 'default'}
                          variant={index < 3 ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.875rem' }}>
                            {customer.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {customer.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {customer.orderCount.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatPrice(customer.totalSpent)}
                      </TableCell>
                      <TableCell align="right">
                        {formatPrice(customer.averageOrderValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default TopCustomersChart;
