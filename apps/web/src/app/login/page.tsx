import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <>
      <div className="backdrop" aria-hidden />
      <main className="relative z-10 grid min-h-screen place-items-center p-4">
        <LoginForm />
      </main>
    </>
  );
}
