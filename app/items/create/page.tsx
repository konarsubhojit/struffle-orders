'use client';

import { useState, useCallback, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import CreateItem from '@/components/items/CreateItem';
import { useItems } from '@/hooks';
import type { Item, ItemId } from '@/types';

function CreateItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFromId = searchParams.get('copyFrom');
  const { data, isLoading } = useItems();
  
  const copiedItem = useMemo(() => {
    if (!copyFromId || !data?.items) return null;
    return data.items.find(i => i.id === parseInt(copyFromId, 10) as ItemId) || null;
  }, [copyFromId, data?.items]);

  const handleItemCreated = useCallback((): void => {
    router.refresh();
    router.push('/items/browse');
  }, [router]);

  const handleCancelCopy = useCallback((): void => {
    router.push('/items/create');
  }, [router]);

  if (isLoading) {
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
    <CreateItem 
      onItemCreated={handleItemCreated}
      copiedItem={copiedItem}
      onCancelCopy={handleCancelCopy}
    />
  );
}

export default function CreateItemPage() {
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
        <CreateItemContent />
      </Suspense>
    </AuthenticatedLayout>
  );
}
