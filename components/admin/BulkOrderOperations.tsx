'use client';

import { useState, useCallback, useRef, type ReactElement, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import TableChartIcon from '@mui/icons-material/TableChart';
import { useNotification } from '@/contexts/NotificationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

type ExportFormat = 'csv' | 'json' | 'xls';
type ExportDateRange = 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: ImportError[];
}

const IMPORT_STEPS = ['Select File', 'Preview Data', 'Import'];

const CSV_TEMPLATE = `customerName,customerPhone,itemName,quantity,pricePerUnit,status,notes,deliveryDate,advancePayment,source
John Doe,+1234567890,T-Shirt Large,2,500,pending,Rush order,2024-12-31,200,website
Jane Smith,+0987654321,Jeans Blue,1,1200,in_progress,,2024-12-25,0,walk-in`;

export default function BulkOrderOperations(): ReactElement {
  const { showSuccess, showError } = useNotification();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xls');
  const [exportDateRange, setExportDateRange] = useState<ExportDateRange>('month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Export handlers
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        format: exportFormat,
      });

      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (exportDateRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (exportStartDate) startDate = new Date(exportStartDate);
          if (exportEndDate) endDate = new Date(exportEndDate);
          break;
      }

      if (startDate) params.set('startDate', startDate.toISOString());
      if (endDate) params.set('endDate', endDate.toISOString());
      if (exportStatus) params.set('status', exportStatus);

      const response = await fetch(`/api/orders/export?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `orders_export.${exportFormat}`;

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

      showSuccess('Orders exported successfully!');
      setExportDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      showError(message);
    } finally {
      setExporting(false);
    }
  }, [exportFormat, exportDateRange, exportStartDate, exportEndDate, exportStatus, showSuccess, showError]);

  // Import handlers
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      showError('Please select a CSV file');
      return;
    }

    setSelectedFile(file);

    // Read and preview the file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      
      if (lines.length < 2) {
        showError('CSV file must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const preview: Record<string, unknown>[] = [];

      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const row: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        preview.push(row);
      }

      setPreviewData(preview);
      setImportStep(1);
    };
    reader.readAsText(file);
  }, [showError]);

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportStep(2);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Import failed');
      }

      setImportResult(result);

      if (result.importedCount > 0) {
        showSuccess(`Successfully imported ${result.importedCount} orders!`);
        queryClient.invalidateQueries({ queryKey: queryKeys.ordersAll() });
      }

      if (result.failedCount > 0) {
        showError(`${result.failedCount} orders failed to import. Check errors below.`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      showError(message);
      setImportResult({
        success: false,
        importedCount: 0,
        failedCount: previewData.length,
        errors: [{ row: 0, message }],
      });
    } finally {
      setImporting(false);
    }
  }, [selectedFile, previewData, showSuccess, showError, queryClient]);

  const resetImport = useCallback(() => {
    setSelectedFile(null);
    setPreviewData([]);
    setImportStep(0);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const downloadTemplate = useCallback(() => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'order_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Bulk Order Operations
      </Typography>
      
      <Grid container spacing={3}>
        {/* Import Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <UploadFileIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="medium">
                  Import Orders
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary">
                Import multiple orders from a CSV file. Download the template to see the required format.
              </Typography>
              
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setImportDialogOpen(true)}
                >
                  Import CSV
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<TableChartIcon />}
                  onClick={downloadTemplate}
                >
                  Download Template
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        {/* Export Section */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <DownloadIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="medium">
                  Export Orders
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary">
                Export orders to CSV, JSON, or Excel format. Filter by date range and status.
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
              >
                Export Orders
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="export-dialog-title"
      >
        <DialogTitle id="export-dialog-title">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Export Orders</span>
            <IconButton onClick={() => setExportDialogOpen(false)} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="export-format-label">Format</InputLabel>
              <Select
                labelId="export-format-label"
                value={exportFormat}
                onChange={(e: SelectChangeEvent) => setExportFormat(e.target.value as ExportFormat)}
                label="Format"
              >
                <MenuItem value="xls">Excel (.xls)</MenuItem>
                <MenuItem value="csv">CSV (.csv)</MenuItem>
                <MenuItem value="json">JSON (.json)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="export-range-label">Date Range</InputLabel>
              <Select
                labelId="export-range-label"
                value={exportDateRange}
                onChange={(e: SelectChangeEvent) => setExportDateRange(e.target.value as ExportDateRange)}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="quarter">This Quarter</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>

            {exportDateRange === 'custom' && (
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            )}

            <FormControl fullWidth>
              <InputLabel id="export-status-label">Status Filter</InputLabel>
              <Select
                labelId="export-status-label"
                value={exportStatus}
                onChange={(e: SelectChangeEvent) => setExportStatus(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting}
            startIcon={exporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => {
          setImportDialogOpen(false);
          resetImport();
        }}
        maxWidth="md"
        fullWidth
        aria-labelledby="import-dialog-title"
      >
        <DialogTitle id="import-dialog-title">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Import Orders from CSV</span>
            <IconButton
              onClick={() => {
                setImportDialogOpen(false);
                resetImport();
              }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={importStep} sx={{ mb: 3 }}>
            {IMPORT_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 0: File Selection */}
          {importStep === 0 && (
            <Box
              sx={{
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                bgcolor: 'grey.50',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input">
                <Stack spacing={2} alignItems="center">
                  <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Drop CSV file here or click to browse
                  </Typography>
                  <Button variant="contained" component="span">
                    Select CSV File
                  </Button>
                </Stack>
              </label>
            </Box>
          )}

          {/* Step 1: Preview */}
          {importStep === 1 && previewData.length > 0 && (
            <Stack spacing={2}>
              <Alert severity="info">
                <AlertTitle>Preview (First 5 rows)</AlertTitle>
                Review the data before importing. Make sure all fields are mapped correctly.
              </Alert>

              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {Object.keys(previewData[0]).map((header) => (
                        <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i}>
                            {String(value || '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="body2" color="text.secondary">
                File: {selectedFile?.name} ({previewData.length}+ rows)
              </Typography>
            </Stack>
          )}

          {/* Step 2: Import Progress/Results */}
          {importStep === 2 && (
            <Stack spacing={3}>
              {importing && (
                <Box textAlign="center" py={4}>
                  <CircularProgress size={48} />
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    Importing orders...
                  </Typography>
                  <LinearProgress sx={{ mt: 2 }} />
                </Box>
              )}

              {importResult && (
                <>
                  <Alert
                    severity={importResult.failedCount > 0 ? 'warning' : 'success'}
                    icon={importResult.failedCount > 0 ? <WarningIcon /> : <CheckCircleIcon />}
                  >
                    <AlertTitle>
                      {importResult.failedCount > 0 ? 'Import Completed with Errors' : 'Import Successful'}
                    </AlertTitle>
                    {importResult.importedCount} orders imported successfully.
                    {importResult.failedCount > 0 && ` ${importResult.failedCount} orders failed.`}
                  </Alert>

                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Chip
                      icon={<CheckCircleIcon />}
                      label={`${importResult.importedCount} Imported`}
                      color="success"
                    />
                    {importResult.failedCount > 0 && (
                      <Chip
                        icon={<ErrorIcon />}
                        label={`${importResult.failedCount} Failed`}
                        color="error"
                      />
                    )}
                  </Stack>

                  {importResult.errors.length > 0 && (
                    <>
                      <Divider />
                      <Typography variant="subtitle2" color="error">
                        Errors:
                      </Typography>
                      <TableContainer sx={{ maxHeight: 200 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Row</TableCell>
                              <TableCell>Field</TableCell>
                              <TableCell>Error</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {importResult.errors.map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>{error.field || '-'}</TableCell>
                                <TableCell>{error.message}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          {importStep === 0 && (
            <Button onClick={() => {
              setImportDialogOpen(false);
              resetImport();
            }}>
              Cancel
            </Button>
          )}
          
          {importStep === 1 && (
            <>
              <Button onClick={resetImport}>Back</Button>
              <Button
                variant="contained"
                onClick={handleImport}
                startIcon={<CloudUploadIcon />}
              >
                Import {previewData.length}+ Orders
              </Button>
            </>
          )}

          {importStep === 2 && !importing && (
            <Button
              variant="contained"
              onClick={() => {
                setImportDialogOpen(false);
                resetImport();
              }}
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
