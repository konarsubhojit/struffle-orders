'use client';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import FeedbackPanel from '@/components/analytics/FeedbackPanel';

export default function FeedbackPage() {
  return (
    <AuthenticatedLayout>
      <FeedbackPanel />
    </AuthenticatedLayout>
  );
}
