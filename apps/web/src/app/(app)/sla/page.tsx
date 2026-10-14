import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { SlaView } from './sla-view';

export const metadata: Metadata = { title: 'SLA' };

export default function SlaPage() {
  return (
    <RequireRole roles={['AGENT', 'MANAGER', 'ADMIN']}>
      <SlaView />
    </RequireRole>
  );
}
