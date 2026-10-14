import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { AssetsView } from './assets-view';

export const metadata: Metadata = { title: 'Ativos' };

export default function AssetsPage() {
  return (
    <RequireRole roles={['AGENT', 'MANAGER', 'ADMIN']}>
      <AssetsView />
    </RequireRole>
  );
}
