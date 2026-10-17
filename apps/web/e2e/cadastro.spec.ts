import { expect, test } from '@playwright/test';
import { nav } from './helpers';

const stamp = Date.now().toString(36);
const EMAIL = `e2e-${stamp}@itsm.local`;
const PASSWORD = 'senha-e2e-12345';

test('cadastro explica o que está errado em vez de ficar parado', async ({ page }) => {
  await page.goto('/register');
  const button = page.getByRole('button', { name: 'Criar conta' });

  // O botão não pode ficar desabilitado em silêncio: enviar vazio mostra o que falta.
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByText('Informe seu nome (ao menos 2 letras)')).toBeVisible();
  await expect(page.getByText('Informe seu e-mail')).toBeVisible();
  await expect(page.getByText('Crie uma senha')).toBeVisible();

  await page.getByLabel('Nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail').fill('sem-dominio@');
  await page.getByLabel('Senha').fill('curta');
  await button.click();
  await expect(page.getByText(/Informe um e-mail válido/)).toBeVisible();
  await expect(page.getByText('A senha precisa ter ao menos 10 caracteres')).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test('cadastro cria a conta de solicitante e recusa e-mail repetido com o motivo', async ({ page, browser }) => {
  await page.goto('/register');
  await page.getByLabel('Nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail').fill(EMAIL);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/tickets$/);
  await expect(nav(page).getByRole('link', { name: 'Chamados' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Painel' })).toHaveCount(0);

  // Outra pessoa tentando o mesmo e-mail precisa ver o motivo, junto do campo.
  const other = await (await browser.newContext()).newPage();
  await other.goto('/register');
  await other.getByLabel('Nome').fill('Outra Pessoa');
  await other.getByLabel('E-mail').fill(EMAIL);
  await other.getByLabel('Senha').fill(PASSWORD);
  await other.getByRole('button', { name: 'Criar conta' }).click();
  await expect(other.getByText('E-mail já cadastrado')).toBeVisible();
  await expect(other).toHaveURL(/\/register/);
  await other.context().close();
});
