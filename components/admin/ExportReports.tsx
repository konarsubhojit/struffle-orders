'use client';

import { useState, useCallback, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import IconButton from '@mui/material/IconButton';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useNotification } from '@/contexts/NotificationContext';

type ReportType = 'orders' | 'salesSummary' | 'items' | 'customers' | 'auditLogs';
type ExportFormat = 'csv' | 'tsv' | 'html' | 'xls';

interface ReportOption {
  type: ReportType;
  title: string;
  description: string;
  icon: ReactElement;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'orders',
    title: 'Orders Report',
    description: 'Complete list of orders with customer and item details',
    icon: <ShoppingCartIcon sx={{ fontSize: 40 }} />,
  },
  {
    type: 'salesSummary',
    title: 'Sales Summary',
    description: 'Sales metrics, revenue, and order statistics',
    icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
  },
  {
    type: 'items',
    title: 'Items Report',
    description: 'Inventory list with pricing and stock information',
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
  },
  {
    type: 'customers',
    title: 'Customers Report',
    description: 'Customer list with contact info and order history',
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
  },
  {
    type: 'auditLogs',
    title: 'Audit Logs',
    description: 'System activity logs for compliance and tracking',
    icon: <HistoryIcon sx={{ fontSize: 40 }} />,
  },
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'xls', label: 'Excel (.xls)', description: 'Best for spreadsheet applications' },
  { value: 'csv', label: 'CSV (.csv)', description: 'Universal format, works everywhere' },
  { value: 'tsv', label: 'TSV (.tsv)', description: 'Tab-separated, good for data import' },
  { value: 'html', label: 'HTML (.html)', description: 'View in browser, printable' },
];

export default function ExportReports(): ReactElement {
  const { showSuccess, showError } = useNotification();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [format, setFormat] = useState<ExportFormat>('xls');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const openExportDialog = useCallback((reportType: ReportType) => {
    setSelectedReport(reportType);
    setFormat('xls');
    setStartDate('');
    setEndDate('');
    setDialogOpen(true);
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedReport) return;

    setExporting(true);
    try {
      const params = new URLSearchParams({
        type: selectedReport,
        format,
      });

      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());

      const response = await fetch(`/api/reports/export?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${selectedReport}_report.${format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess('Report exported successfully!');
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      showError(message);
    } finally {
      setExporting(false);
    }
  }, [selectedReport, format, startDate, endDate, showSuccess, showError]);

  const selectedReportOption = REPORT_OPTIONS.find((r) => r.type === selectedReport);

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <TableChartIcon color="primary" />
        <Typography variant="h6" component="h2">
          Export Reports
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" mb={3}>
        Generate and download reports in various formats. Choose a report type to get started.
      </Typography>

      <Grid container spacing={2}>
        {REPORT_OPTIONS.map((report) => (
          <Grid key={report.type} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <CardActionArea
                onClick={() => openExportDialog(report.type)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {report.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    {report.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {report.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Export Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="export-report-dialog-title"
      >
        <DialogTitle id="export-report-dialog-title">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              {selectedReportOption?.icon && (
                <Box sx={{ color: 'primary.main', display: 'flex' }}>
                  {selectedReportOption.icon}
                </Box>
              )}
              <span>Export {selectedReportOption?.title}</span>
            </Stack>
            <IconButton onClick={() => setDialogOpen(false)} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="report-format-label">Export Format</InputLabel>
              <Select
                labelId="report-format-label"
                value={format}
                onChange={(e: SelectChangeEvent) => setFormat(e.target.value as ExportFormat)}
                label="Export Format"
              >
                {FORMAT_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Stack>
                      <Typography variant="body1">{opt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle2" color="text.secondary">
              Date Range (optional)
            </Typography>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            {selectedReport === 'auditLogs' && (
              <Typography variant="body2" color="text.secondary">
                Note: Audit logs can be large. Consider using a date filter for better performance.
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting}
            startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {exporting ? 'Generating...' : 'Export Report'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
