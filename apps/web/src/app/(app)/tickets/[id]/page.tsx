import type { Metadata } from 'next';
import { TicketDetail } from './ticket-detail';

export const metadata: Metadata = { title: 'Chamado' };

export default function TicketPage() {
  return <TicketDetail />;
}
