import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loading } from '@/components/ui/states';
import { TicketsView } from './tickets-view';

export const metadata: Metadata = { title: 'Chamados' };

export default function TicketsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TicketsView />
    </Suspense>
  );
}
