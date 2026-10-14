import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { UsersView } from './users-view';

export const metadata: Metadata = { title: 'Usuários' };

export default function UsersPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <UsersView />
    </RequireRole>
  );
}
