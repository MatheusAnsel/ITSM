import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <AuthCard title="Entrar no ITSM" subtitle="Gestão de chamados e ativos de TI">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
