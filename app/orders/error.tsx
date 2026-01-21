'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Error boundary for orders pages
 */
export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    console.error('Orders page error:', error);
  }, [error]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        gap: 2,
        p: 3,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
      <Typography variant="h5" component="h1" gutterBottom>
        Failed to Load Orders
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {error.message || 'Unable to load orders. Please try again.'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
        <Button variant="outlined" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    </Box>
  );
}
