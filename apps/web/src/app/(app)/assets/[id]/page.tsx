import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { AssetDetail } from './asset-detail';

export const metadata: Metadata = { title: 'Ativo' };

export default function AssetPage() {
  return (
    <RequireRole roles={['AGENT', 'MANAGER', 'ADMIN']}>
      <AssetDetail />
    </RequireRole>
  );
}
