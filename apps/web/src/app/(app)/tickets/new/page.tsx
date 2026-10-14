import type { Metadata } from 'next';
import { NewTicketForm } from './new-ticket-form';

export const metadata: Metadata = { title: 'Novo chamado' };

export default function NewTicketPage() {
  return <NewTicketForm />;
}
