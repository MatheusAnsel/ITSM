import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { DashboardView } from './dashboard-view';

export const metadata: Metadata = { title: 'Painel' };

export default function DashboardPage() {
  return (
    <RequireRole roles={['MANAGER', 'ADMIN']}>
      <DashboardView />
    </RequireRole>
  );
}
