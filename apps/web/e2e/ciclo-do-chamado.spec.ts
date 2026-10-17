import { expect, test, type Browser, type Page } from '@playwright/test';
import { loginAs, nav, type DemoRole } from './helpers';

// Um perfil por contexto de navegador, como pessoas diferentes em máquinas diferentes.
async function sessionAs(browser: Browser, role: DemoRole): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  return page;
}

// Um título único por execução evita colisão com os chamados do seed e com execuções repetidas.
const stamp = Date.now().toString(36);
const TITLE = `E2E notebook sem rede ${stamp}`;
const PUBLIC_NOTE = `Reiniciei o roteador e continua sem rede ${stamp}`;
const INTERNAL_NOTE = `Nota interna: trocar o cabo de rede ${stamp}`;
const AGENT_REPLY = `Trocamos o cabo e a rede voltou ${stamp}`;

test.describe.configure({ mode: 'serial' });

let ticketPath = '';

test('solicitante abre um chamado e comenta', async ({ browser }) => {
  const page = await sessionAs(browser, 'Solicitante');

  await page.goto('/tickets/new');
  await page.getByLabel('Título').fill(TITLE);
  await page.getByLabel('Descrição').fill('O notebook perdeu a conexão com a rede cabeada desde cedo.');
  await page.getByLabel('Categoria').selectOption({ label: 'Rede' });
  await page.getByRole('button', { name: 'Abrir chamado' }).click();

  await expect(page).toHaveURL(/\/tickets\/(?!new)[^/]+$/);
  ticketPath = new URL(page.url()).pathname;
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(page.getByText('Aberto', { exact: true }).first()).toBeVisible();

  await page.getByLabel('Novo comentário').fill(PUBLIC_NOTE);
  await page.getByRole('button', { name: 'Comentar' }).click();
  await expect(page.getByText(PUBLIC_NOTE)).toBeVisible();

  // O solicitante só enxerga a própria fila e não tem acesso ao painel gerencial.
  await expect(nav(page).getByRole('link', { name: 'Painel' })).toHaveCount(0);
  await page.context().close();
});

test('atendente assume, deixa nota interna, responde e resolve', async ({ browser }) => {
  test.skip(!ticketPath, 'depende do chamado criado no teste anterior');
  const page = await sessionAs(browser, 'Atendente');
  await page.goto(ticketPath);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();

  // Assumir um chamado aberto o coloca em atendimento (RN-03).
  await page.getByRole('button', { name: 'Assumir' }).click();
  await expect(page.getByRole('button', { name: 'Marcar como resolvido' })).toBeVisible();

  await page.getByLabel('Novo comentário').fill(INTERNAL_NOTE);
  await page.getByLabel('Comentário interno').check();
  await page.getByRole('button', { name: 'Comentar' }).click();
  await expect(page.getByText(INTERNAL_NOTE)).toBeVisible();

  await page.getByLabel('Novo comentário').fill(AGENT_REPLY);
  await page.getByRole('button', { name: 'Comentar' }).click();
  await expect(page.getByText(AGENT_REPLY)).toBeVisible();

  await page.getByRole('button', { name: 'Marcar como resolvido' }).click();
  await expect(page.getByRole('button', { name: 'Fechar chamado' })).toBeVisible();
  await page.context().close();
});

test('solicitante vê a resposta pública, nunca a nota interna', async ({ browser }) => {
  test.skip(!ticketPath, 'depende do chamado criado no primeiro teste');
  const page = await sessionAs(browser, 'Solicitante');
  await page.goto(ticketPath);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();

  await expect(page.getByText(AGENT_REPLY)).toBeVisible();
  await expect(page.getByText(INTERNAL_NOTE)).toHaveCount(0);
  await expect(page.getByText('Resolvido', { exact: true }).first()).toBeVisible();
  await page.context().close();
});
