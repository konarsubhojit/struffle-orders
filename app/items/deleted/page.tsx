'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ManageDeletedItems from '@/components/items/ManageDeletedItems';

export default function DeletedItemsPage() {
  const router = useRouter();

  const handleItemsChange = useCallback((): void => {
    router.refresh();
  }, [router]);

  return (
    <AuthenticatedLayout>
      <ManageDeletedItems onItemsChange={handleItemsChange} />
    </AuthenticatedLayout>
  );
}
