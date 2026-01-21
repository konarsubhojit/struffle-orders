'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ItemDetailsPage from '@/components/items/ItemDetailsPage';
import type { ItemId } from '@/types';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ItemByIdPage({ params }: PageProps) {
  const router = useRouter();
  const [itemId, setItemId] = useState<ItemId | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      const parsedId = Number.parseInt(id, 10);
      if (!Number.isNaN(parsedId)) {
        setItemId(parsedId as ItemId);
      }
    });
  }, [params]);

  const handleBack = () => {
    router.push('/items/browse');
  };

  const handleItemUpdated = () => {
    router.refresh();
  };

  if (!itemId) {
    return (
      <AuthenticatedLayout>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <ItemDetailsPage
        itemId={itemId}
        onBack={handleBack}
        onItemUpdated={handleItemUpdated}
      />
    </AuthenticatedLayout>
  );
}
