'use client';

import { useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import OrderHistory from '@/components/orders/OrderHistory';
import type { OrderId } from '@/types';

function OrderHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId');
  const initialSelectedOrderId = orderIdParam ? (parseInt(orderIdParam, 10) as OrderId) : null;

  const handleDuplicateOrder = useCallback((orderId: string): void => {
    router.push(`/orders/create?duplicateOrderId=${orderId}`);
  }, [router]);

  const handleOrderDetailsClose = useCallback((): void => {
    router.push('/orders/history');
  }, [router]);

  return (
    <OrderHistory 
      onDuplicateOrder={handleDuplicateOrder}
      initialSelectedOrderId={initialSelectedOrderId}
      onOrderDetailsClose={handleOrderDetailsClose}
    />
  );
}

export default function OrderHistoryPage() {
  return (
    <AuthenticatedLayout>
      <Suspense fallback={
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="60vh"
          gap={2}
        >
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      }>
        <OrderHistoryContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
