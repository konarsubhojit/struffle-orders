'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Button, Typography, Card, CardContent, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PreviewIcon from '@mui/icons-material/Preview';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    await signIn('google', { callbackUrl: '/orders/create' });
  };

  const handleGuestMode = () => {
    sessionStorage.setItem('guestMode', 'true');
    router.push('/orders/create');
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textAlign: 'center',
              }}
            >
              Kiyon Store
            </Typography>
            
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Sign in to manage your orders and inventory
            </Typography>

            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              sx={{
                py: 1.5,
                mt: 2,
              }}
            >
              Sign in with Google
            </Button>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<PreviewIcon />}
              onClick={handleGuestMode}
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  bgcolor: 'rgba(102, 126, 234, 0.05)',
                }
              }}
            >
              Continue as Guest (View Only)
            </Button>

            <Divider sx={{ width: '100%', my: 1 }} />

            <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>

            <Typography variant="caption" color="text.disabled" textAlign="center">
              Version {APP_VERSION}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
