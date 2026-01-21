'use client';

import { useState, useMemo, type ReactElement } from 'react';
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
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid2';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import { useAuditLogs, useRecentActivity } from '@/hooks/queries/useAuditLogsQueries';
import type { AuditLog } from '@/types';

type DateFormatType = 'date' | 'datetime' | 'time' | 'relative' | 'short';

/**
 * Format a date to a relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

/**
 * Format a date according to the specified format type
 */
function formatDate(date: Date | string | number, format: DateFormatType = 'date'): string {
  const d = date instanceof Date ? date : new Date(date);
  
  if (Number.isNaN(d.getTime())) {
    return 'Invalid date';
  }

  switch (format) {
    case 'datetime':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'relative':
      return formatRelativeTime(d);
    default:
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}

type EntityType = '' | 'order' | 'item' | 'category' | 'tag' | 'user' | 'system';
type ActionType = '' | 'create' | 'update' | 'delete' | 'bulk_import' | 'bulk_export' | 'status_change' | 'restore';

interface FiltersState {
  entityType: EntityType;
  action: ActionType;
  userId: string;
  startDate: string;
  endDate: string;
}

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  bulk_import: 'info',
  bulk_export: 'info',
  status_change: 'warning',
  restore: 'success',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  bulk_import: 'Bulk Import',
  bulk_export: 'Bulk Export',
  status_change: 'Status Changed',
  restore: 'Restored',
};

const ENTITY_LABELS: Record<string, string> = {
  order: 'Order',
  item: 'Item',
  category: 'Category',
  tag: 'Tag',
  user: 'User',
  system: 'System',
};

interface AuditLogRowProps {
  log: AuditLog;
}

function AuditLogRow({ log }: AuditLogRowProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.previousData || log.newData || log.changedFields?.length || log.metadata;

  return (
    <>
      <TableRow hover>
        <TableCell sx={{ width: 40, p: 1 }}>
          {hasDetails && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formatRelativeTime(new Date(log.createdAt))}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(new Date(log.createdAt), 'datetime')}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={ACTION_LABELS[log.action] || log.action}
            color={ACTION_COLORS[log.action] || 'default'}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={ENTITY_LABELS[log.entityType] || log.entityType}
              variant="outlined"
              size="small"
            />
            <Typography variant="body2">#{log.entityId}</Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {log.userName || log.userEmail || log.userId || 'System'}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {log.ipAddress || '-'}
          </Typography>
        </TableCell>
      </TableRow>
      
      {hasDetails && (
        <TableRow>
          <TableCell colSpan={6} sx={{ py: 0 }}>
            <Collapse in={expanded}>
              <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                {log.changedFields && log.changedFields.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Changed Fields
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {log.changedFields.map((field) => (
                        <Chip key={field} label={field} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Box>
                )}
                
                <Grid container spacing={2}>
                  {log.previousData && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Previous Value
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          p: 1,
                          bgcolor: 'error.50',
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.75rem',
                          maxHeight: 200,
                        }}
                      >
                        {JSON.stringify(log.previousData, null, 2)}
                      </Box>
                    </Grid>
                  )}
                  
                  {log.newData && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        New Value
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          p: 1,
                          bgcolor: 'success.50',
                          borderRadius: 1,
                          overflow: 'auto',
                          fontSize: '0.75rem',
                          maxHeight: 200,
                        }}
                      >
                        {JSON.stringify(log.newData, null, 2)}
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {log.metadata && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Metadata
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        p: 1,
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.75rem',
                        maxHeight: 150,
                      }}
                    >
                      {JSON.stringify(log.metadata, null, 2)}
                    </Box>
                  </Box>
                )}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AuditLogsViewer(): ReactElement {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FiltersState>({
    entityType: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const f: Record<string, unknown> = {};
    if (filters.entityType) f.entityType = filters.entityType;
    if (filters.action) f.action = filters.action;
    if (filters.userId) f.userId = filters.userId;
    if (filters.startDate) f.startDate = new Date(filters.startDate);
    if (filters.endDate) f.endDate = new Date(filters.endDate);
    return f;
  }, [filters]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useAuditLogs(queryFilters);

  const { data: recentActivity } = useRecentActivity(24);

  // Flatten pages
  const logs = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  const handleFilterChange = (field: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      entityType: '',
      action: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
  };

  const handleExport = () => {
    const params = new URLSearchParams({
      type: 'auditLogs',
      format: 'xls',
    });
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    
    window.location.href = `/api/reports/export?${params.toString()}`;
  };

  if (error) {
    return (
      <Alert severity="error">
        Failed to load audit logs: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <HistoryIcon color="primary" />
          <Typography variant="h6" component="h2">
            Audit Logs
          </Typography>
          {recentActivity && (
            <Chip
              label={`${recentActivity.summary.total} events (24h)`}
              size="small"
              color="info"
            />
          )}
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Tooltip title="Export to Excel">
            <IconButton onClick={handleExport}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Filters */}
      <Collapse in={showFilters}>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-entity-label">Entity Type</InputLabel>
                <Select
                  labelId="filter-entity-label"
                  value={filters.entityType}
                  onChange={(e: SelectChangeEvent) => handleFilterChange('entityType', e.target.value)}
                  label="Entity Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="order">Order</MenuItem>
                  <MenuItem value="item">Item</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="tag">Tag</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-action-label">Action</InputLabel>
                <Select
                  labelId="filter-action-label"
                  value={filters.action}
                  onChange={(e: SelectChangeEvent) => handleFilterChange('action', e.target.value)}
                  label="Action"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="create">Create</MenuItem>
                  <MenuItem value="update">Update</MenuItem>
                  <MenuItem value="delete">Delete</MenuItem>
                  <MenuItem value="status_change">Status Change</MenuItem>
                  <MenuItem value="bulk_import">Bulk Import</MenuItem>
                  <MenuItem value="bulk_export">Bulk Export</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                fullWidth
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                label="End Date"
                type="date"
                size="small"
                fullWidth
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                label="User ID"
                size="small"
                fullWidth
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Filter by user"
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button fullWidth variant="outlined" onClick={clearFilters}>
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Activity Summary */}
      {recentActivity && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {Object.entries(recentActivity.summary.byAction).slice(0, 4).map(([action, count]) => (
            <Grid key={action} size={{ xs: 6, md: 3 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  textAlign: 'center',
                }}
              >
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ACTION_LABELS[action] || action}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Logs Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No audit logs found.
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small" aria-label="Audit logs table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Entity</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <AuditLogRow key={log._id} log={log} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {hasNextPage && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outlined"
              >
                {isFetchingNextPage ? (
                  <CircularProgress size={20} />
                ) : (
                  'Load More'
                )}
              </Button>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
