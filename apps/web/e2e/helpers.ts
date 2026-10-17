import { expect, type Page } from '@playwright/test';

export type DemoRole = 'Gestor' | 'Atendente' | 'Solicitante';

// A tela de login em modo demonstração tem um botão por perfil ("Entrar como ..."), igual à demo pública.
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(`Entrar como ${role}`) }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole('navigation', { name: 'Principal', exact: true })).toBeVisible();
}

export function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Principal', exact: true });
}
