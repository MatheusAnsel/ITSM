import { expect, test } from '@playwright/test';
import { loginAs, nav } from './helpers';

test('gestor vê o painel gerencial e as políticas de SLA', async ({ page }) => {
  await loginAs(page, 'Gestor');

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'Painel gerencial' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Indicadores' })).toBeVisible();

  await nav(page).getByRole('link', { name: 'SLA' }).click();
  await expect(page).toHaveURL(/\/sla$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Auditoria e cadastro de usuários são só do administrador.
  await expect(nav(page).getByRole('link', { name: 'Auditoria' })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'Usuários' })).toHaveCount(0);
});

test('solicitante é barrado no painel gerencial pela própria tela', async ({ page }) => {
  await loginAs(page, 'Solicitante');
  await page.goto('/dashboard');
  await expect(page.getByText('Seu perfil não tem acesso a esta tela.')).toBeVisible();
});

test('quem não está logado é levado ao login e volta para onde estava', async ({ page }) => {
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login\?next=%2Ftickets/);
  await page.getByRole('button', { name: /Entrar como Atendente/ }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('login com senha errada mostra o erro e não entra', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill('gestor@itsm.local');
  await page.getByLabel('Senha').fill('senha-errada-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  // O anunciador de rotas do Next também tem role=alert; o filtro pelo formulário evita ambiguidade.
  await expect(page.locator('form p[role="alert"]')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
