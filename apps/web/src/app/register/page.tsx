import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Criar conta' };

export default function RegisterPage() {
  return (
    <AuthCard title="Criar conta" subtitle="Acesso de solicitante para abrir chamados">
      <RegisterForm />
    </AuthCard>
  );
}
