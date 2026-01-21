'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import SalesReport from '@/components/analytics/SalesReport';

export default function SalesReportPage() {
  return (
    <AuthenticatedLayout>
      <SalesReport />
    </AuthenticatedLayout>
  );
}
