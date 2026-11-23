import type { Metadata } from 'next';
import { isAdmin } from '@/server/auth';
import { AdminApp } from '@/components/admin/AdminApp';
import { AdminGate } from '@/components/admin/AdminGate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Instructor portal',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  return (await isAdmin()) ? <AdminApp /> : <AdminGate />;
}
