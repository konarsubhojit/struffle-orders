'use client';

import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { PaginationInfo } from '@/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

interface PaginationControlsProps {
  paginationData: PaginationInfo;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Reusable pagination controls component
 * Shows page size selector, count information, and page navigation
 */
function PaginationControls({ 
  paginationData, 
  onPageChange, 
  onLimitChange,
  size = 'medium'
}: PaginationControlsProps) {
  const { page, limit, total, totalPages } = paginationData;

  const handleLimitChange = (event: SelectChangeEvent<number>) => {
    onLimitChange(parseInt(String(event.target.value), 10));
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mt: 2,
        ...(size === 'small' ? {} : { p: 2, bgcolor: 'grey.50', borderRadius: 2 })
      }}
    >
      <FormControl size="small" sx={{ minWidth: size === 'small' ? 100 : 120 }}>
        <InputLabel id="page-size-label">Per page</InputLabel>
        <Select
          labelId="page-size-label"
          value={limit}
          label="Per page"
          onChange={handleLimitChange}
        >
          {PAGE_SIZE_OPTIONS.map((option: PageSizeOption) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary">
        Page {page} of {totalPages || 1} ({total} items)
      </Typography>
      <Pagination
        count={totalPages || 1}
        page={page}
        onChange={(_event, newPage) => onPageChange(newPage)}
        color="primary"
        showFirstButton
        showLastButton
        size={size}
      />
    </Box>
  );
}

export default PaginationControls;
