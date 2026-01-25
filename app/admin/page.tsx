'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import AdminPage from '@/components/admin/AdminPage';

export default function AdminPageRoute() {
  return (
    <AuthenticatedLayout>
      <AdminPage />
    </AuthenticatedLayout>
  );
}
