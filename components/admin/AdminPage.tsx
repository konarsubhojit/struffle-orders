'use client';

import { useState, useEffect, useCallback, type SyntheticEvent } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import HistoryIcon from '@mui/icons-material/History';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import TableChartIcon from '@mui/icons-material/TableChart';
import { getUsers, updateUserRole, getUserStats, type User, type UserStats } from '@/lib/api/client';
import CategoriesManager from './CategoriesManager';
import TagsManager from './TagsManager';
import AuditLogsViewer from './AuditLogsViewer';
import BulkOrderOperations from './BulkOrderOperations';
import ExportReports from './ExportReports';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: User | null;
    newRole: 'admin' | 'user' | null;
  }>({ open: false, user: null, newRole: null });
  const [updating, setUpdating] = useState(false);

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData] = await Promise.all([
        getUsers(),
        getUserStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = (user: User, newRole: 'admin' | 'user') => {
    setConfirmDialog({ open: true, user, newRole });
  };

  const confirmRoleChange = async () => {
    if (!confirmDialog.user || !confirmDialog.newRole) return;

    try {
      setUpdating(true);
      setError(null);
      await updateUserRole(confirmDialog.user.id, confirmDialog.newRole);
      
      // Refresh data
      await fetchData();
      
      setConfirmDialog({ open: false, user: null, newRole: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
      console.error('Error updating user role:', err);
    } finally {
      setUpdating(false);
    }
  };

  const cancelRoleChange = () => {
    setConfirmDialog({ open: false, user: null, newRole: null });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has admin access
  if (session?.user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don&apos;t have permission to access this page. Admin access required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminPanelSettingsIcon fontSize="large" />
        Admin Panel
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Admin panel tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} label="Users" {...a11yProps(0)} />
          <Tab icon={<CategoryIcon />} label="Categories" {...a11yProps(1)} />
          <Tab icon={<LocalOfferIcon />} label="Tags" {...a11yProps(2)} />
          <Tab icon={<ImportExportIcon />} label="Import/Export" {...a11yProps(3)} />
          <Tab icon={<TableChartIcon />} label="Reports" {...a11yProps(4)} />
          <Tab icon={<HistoryIcon />} label="Audit Logs" {...a11yProps(5)} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h3">{stats.totalUsers}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Admin Users
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {stats.adminUsers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Regular Users
                  </Typography>
                  <Typography variant="h3" color="secondary">
                    {stats.regularUsers}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Users Table */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
            User Management
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = session?.user?.dbUserId === user.id;
                  const isAdmin = user.role === 'admin';

                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar src={user.picture ?? undefined} alt={user.name} sx={{ width: 32, height: 32 }}>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {user.name}
                              {isCurrentUser && (
                                <Chip label="You" size="small" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          icon={isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                          label={isAdmin ? 'Admin' : 'User'}
                          color={isAdmin ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            disabled={isCurrentUser || updating}
                            onClick={() => handleRoleChange(user, 'user')}
                          >
                            Revoke Admin
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            disabled={updating}
                            onClick={() => handleRoleChange(user, 'admin')}
                          >
                            Make Admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <CategoriesManager />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <TagsManager />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <BulkOrderOperations />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <ExportReports />
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <AuditLogsViewer />
      </TabPanel>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={cancelRoleChange}>
        <DialogTitle>Confirm Role Change</DialogTitle>
        <DialogContent>
          {confirmDialog.user && confirmDialog.newRole && (
            <Typography>
              Are you sure you want to change <strong>{confirmDialog.user.name}</strong>&apos;s role to{' '}
              <strong>{confirmDialog.newRole}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelRoleChange} disabled={updating}>
            Cancel
          </Button>
          <Button onClick={confirmRoleChange} variant="contained" disabled={updating}>
            {updating ? <CircularProgress size={20} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
