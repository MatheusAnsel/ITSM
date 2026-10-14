import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { AuditView } from './audit-view';

export const metadata: Metadata = { title: 'Auditoria' };

export default function AuditPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <AuditView />
    </RequireRole>
  );
}
