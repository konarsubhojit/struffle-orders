'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Root error boundary for the application
 * Catches errors in all pages and provides a fallback UI
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          gap: 2,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main' }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Something went wrong!
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </Typography>
        {error.digest && (
          <Typography variant="caption" color="text.disabled">
            Error ID: {error.digest}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            onClick={reset}
            aria-label="Try again"
          >
            Try again
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push('/')}
            aria-label="Go to home page"
          >
            Go to Home
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
