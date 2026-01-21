'use client';

import { useState, useMemo, useCallback, SyntheticEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Grid from '@mui/material/Grid2';
import Divider from '@mui/material/Divider';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import InventoryIcon from '@mui/icons-material/Inventory';
import GroupIcon from '@mui/icons-material/Group';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { type AnalyticsFilters } from '@/hooks/queries/useAdvancedAnalyticsQueries';
import ProfitAnalytics from './ProfitAnalytics';
import SalesTrends from './SalesTrends';
import TopItemsChart from './TopItemsChart';
import TopCustomersChart from './TopCustomersChart';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  id: string;
  ariaLabelledby: string;
}

function TabPanel({ children, value, index, id, ariaLabelledby }: Readonly<TabPanelProps>) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={id}
      aria-labelledby={ariaLabelledby}
      sx={{ py: 3 }}
    >
      {value === index && children}
    </Box>
  );
}

type TabId = 'overview' | 'profit' | 'trends' | 'top-items' | 'top-customers';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactElement;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <DashboardIcon /> },
  { id: 'profit', label: 'Profit Analysis', icon: <AccountBalanceIcon /> },
  { id: 'trends', label: 'Sales Trends', icon: <TrendingUpIcon /> },
  { id: 'top-items', label: 'Top Items', icon: <InventoryIcon /> },
  { id: 'top-customers', label: 'Top Customers', icon: <GroupIcon /> },
];

interface QuickDateRange {
  label: string;
  days: number;
}

const QUICK_DATE_RANGES: QuickDateRange[] = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '1 Year', days: 365 },
];

/**
 * Analytics Dashboard container component
 * Provides tabbed navigation and global date filtering for all analytics views
 */
function AnalyticsDashboard() {
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedQuickRange, setSelectedQuickRange] = useState<number | null>(30);

  /**
   * Calculate date range from quick selection
   */
  const getDateRange = useCallback((days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  /**
   * Handle quick date range selection
   */
  const handleQuickRangeSelect = useCallback((days: number) => {
    setSelectedQuickRange(days);
    const range = getDateRange(days);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, [getDateRange]);

  /**
   * Handle custom date change
   */
  const handleCustomDateChange = useCallback((field: 'start' | 'end', value: string) => {
    setSelectedQuickRange(null);
    if (field === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  }, []);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((_event: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  /**
   * Global filters passed to all analytics components
   */
  const globalFilters: AnalyticsFilters = useMemo(() => ({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  }), [startDate, endDate]);

  /**
   * Refresh all analytics data
   */
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  }, [queryClient]);

  // Initialize with 30-day range on mount
  useMemo(() => {
    if (!startDate && !endDate && selectedQuickRange) {
      const range = getDateRange(selectedQuickRange);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  }, []);

  return (
    <Box component="main" sx={{ p: 3 }}>
      {/* Header */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive insights into your business performance
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          aria-label="Refresh all analytics data"
        >
          Refresh
        </Button>
      </Box>

      {/* Global Date Filters */}
      <Paper 
        variant="outlined" 
        sx={{ p: 2, mb: 3 }}
        component="section"
        aria-labelledby="date-filters-heading"
      >
        <Typography 
          id="date-filters-heading" 
          variant="subtitle2" 
          color="text.secondary" 
          sx={{ mb: 2 }}
        >
          Date Range (applies to all sections)
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          {/* Quick Range Buttons */}
          <Grid size={{ xs: 12, md: 'auto' }}>
            <ButtonGroup 
              size="small" 
              aria-label="Quick date range selection"
            >
              {QUICK_DATE_RANGES.map((range) => (
                <Button
                  key={range.days}
                  variant={selectedQuickRange === range.days ? 'contained' : 'outlined'}
                  onClick={() => handleQuickRangeSelect(range.days)}
                  aria-pressed={selectedQuickRange === range.days}
                >
                  {range.label}
                </Button>
              ))}
            </ButtonGroup>
          </Grid>

          <Grid size={{ xs: 12, md: 'auto' }}>
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 1 }} />
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ display: { xs: 'block', md: 'none' }, my: 1 }}
            >
              Or select custom dates:
            </Typography>
          </Grid>

          {/* Custom Date Inputs */}
          <Grid size={{ xs: 6, sm: 'auto' }}>
            <TextField
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { 'aria-label': 'Start date for analytics' },
              }}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 'auto' }}>
            <TextField
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { 'aria-label': 'End date for analytics' },
              }}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs Navigation */}
      <Paper variant="outlined" sx={{ mb: 0 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Analytics sections"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 56,
            },
          }}
        >
          {TABS.map((tab, index) => (
            <Tab
              key={tab.id}
              id={`analytics-tab-${tab.id}`}
              aria-controls={`analytics-tabpanel-${tab.id}`}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
              sx={{ textTransform: 'none' }}
            />
          ))}
        </Tabs>

        <Box sx={{ px: 3 }}>
          {/* Overview Tab - Shows summary of all sections */}
          <TabPanel 
            value={activeTab} 
            index={0}
            id="analytics-tabpanel-overview"
            ariaLabelledby="analytics-tab-overview"
          >
            <Typography variant="h5" component="h2" gutterBottom>
              Business Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              A high-level summary of your business metrics for the selected period.
            </Typography>
            
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <ProfitAnalytics 
                    externalFilters={globalFilters} 
                    showDateFilters={false}
                  />
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <TopItemsChart 
                    externalFilters={globalFilters} 
                    showDateFilters={false}
                    limit={5}
                  />
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <SalesTrends 
                    externalFilters={globalFilters} 
                    showDateFilters={false}
                  />
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Profit Analysis Tab */}
          <TabPanel 
            value={activeTab} 
            index={1}
            id="analytics-tabpanel-profit"
            ariaLabelledby="analytics-tab-profit"
          >
            <ProfitAnalytics 
              externalFilters={globalFilters} 
              showDateFilters={false}
            />
          </TabPanel>

          {/* Sales Trends Tab */}
          <TabPanel 
            value={activeTab} 
            index={2}
            id="analytics-tabpanel-trends"
            ariaLabelledby="analytics-tab-trends"
          >
            <SalesTrends 
              externalFilters={globalFilters} 
              showDateFilters={false}
            />
          </TabPanel>

          {/* Top Items Tab */}
          <TabPanel 
            value={activeTab} 
            index={3}
            id="analytics-tabpanel-top-items"
            ariaLabelledby="analytics-tab-top-items"
          >
            <TopItemsChart 
              externalFilters={globalFilters} 
              showDateFilters={false}
              limit={10}
            />
          </TabPanel>

          {/* Top Customers Tab */}
          <TabPanel 
            value={activeTab} 
            index={4}
            id="analytics-tabpanel-top-customers"
            ariaLabelledby="analytics-tab-top-customers"
          >
            <TopCustomersChart 
              externalFilters={globalFilters} 
              showDateFilters={false}
              limit={10}
            />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}

export default AnalyticsDashboard;
