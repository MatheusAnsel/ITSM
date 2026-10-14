'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Loading } from '@/components/ui/states';
import { isManager } from '@/lib/types';

// Cada perfil começa na tela que mais usa: gestão no painel, os demais nos chamados.
export default function Home() {
  const { user, booting } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (booting) return;
    router.replace(!user ? '/login' : isManager(user.role) ? '/dashboard' : '/tickets');
  }, [user, booting, router]);
  return <Loading />;
}
