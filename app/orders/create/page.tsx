'use client';

import { useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import OrderForm from '@/components/orders/OrderForm';
import { useItems } from '@/hooks';
import type { Item } from '@/types';

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isLoading: itemsLoading } = useItems();
  const items: Item[] = data?.items ?? [];
  const duplicateOrderId = searchParams.get('duplicateOrderId');

  const handleOrderCreated = useCallback((): void => {
    router.refresh();
    router.push('/orders/history');
  }, [router]);

  if (itemsLoading) {
    return (
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
          Loading items...
        </Typography>
      </Box>
    );
  }

  return (
    <OrderForm 
      items={items}
      onOrderCreated={handleOrderCreated}
      duplicateOrderId={duplicateOrderId}
    />
  );
}

export default function CreateOrderPage() {
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
        <CreateOrderContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
