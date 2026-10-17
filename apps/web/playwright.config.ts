import { defineConfig, devices } from '@playwright/test';

// Testes de ponta a ponta no navegador: sobem a API e o site já compilados e percorrem os fluxos da demo.
// No CI o banco é um PostgreSQL de serviço, com migrations e seed de demonstração aplicados antes.
// Localmente: `docker compose up -d postgres`, migrations e seed (veja README), build da API e do web, e
// `npm run test:browser -w apps/web`.
const WEB_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // No CI o reporter "github" transforma cada falha em anotação na execução, com a mensagem do erro.
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
  webServer: [
    {
      command: 'node dist/main',
      cwd: '../api',
      url: `${API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run start',
      url: `${WEB_URL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
