'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import BrowseItems from '@/components/items/BrowseItems';
import type { Item } from '@/types';

export default function BrowseItemsPage() {
  const router = useRouter();

  const handleCopyItem = useCallback((item: Item): void => {
    router.push(`/items/create?copyFrom=${item.id}`);
  }, [router]);

  const handleItemsChange = useCallback((): void => {
    router.refresh();
  }, [router]);

  return (
    <AuthenticatedLayout>
      <BrowseItems 
        onItemsChange={handleItemsChange}
        onCopyItem={handleCopyItem}
      />
    </AuthenticatedLayout>
  );
}
