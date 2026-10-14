import type { Metadata } from 'next';
import { RequireRole } from '@/components/auth/require-role';
import { CategoriesView } from './categories-view';

export const metadata: Metadata = { title: 'Categorias' };

export default function CategoriesPage() {
  return (
    <RequireRole roles={['ADMIN']}>
      <CategoriesView />
    </RequireRole>
  );
}
