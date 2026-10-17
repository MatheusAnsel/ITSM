// Verificação pós-deploy da demonstração: espera a API responder com o banco de pé e, quando se sabe qual
// commit deveria estar no ar, espera essa versão aparecer. Falha com uma mensagem clara se não chegar a tempo.
//
//   DEMO_URL=https://itsm-demo-six.vercel.app EXPECTED_COMMIT=<sha> node scripts/smoke.mjs
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(fetchImpl, url, requestTimeoutMs) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* corpo que não é JSON: tratado como resposta inválida */
  }
  return { status: res.status, body };
}

// Devolve { ok, attempts, last, reason }. `last` é o corpo mais recente de /api/health.
export async function waitForHealthy({
  baseUrl,
  expectedCommit = '',
  timeoutMs = 12 * 60_000,
  intervalMs = 15_000,
  requestTimeoutMs = 40_000,
  fetchImpl = fetch,
  sleep = sleepMs,
  now = Date.now,
  log = () => {},
}) {
  const deadline = now() + timeoutMs;
  const base = baseUrl.replace(/\/+$/, '');
  let attempts = 0;
  let reason = 'sem resposta';
  let last = null;

  while (now() <= deadline) {
    attempts += 1;
    try {
      const { status, body } = await getJson(fetchImpl, `${base}/api/health`, requestTimeoutMs);
      last = body;
      if (status !== 200) {
        reason = `/api/health respondeu ${status}`;
      } else if (body?.status !== 'ok' || body?.database !== 'up') {
        reason = `/api/health sem banco de pé: ${JSON.stringify(body)}`;
      } else if (expectedCommit && !(typeof body.commit === 'string' && body.commit.startsWith(expectedCommit))) {
        reason = `versão no ar (${body.commit ?? 'não informada'}) ainda não é a esperada (${expectedCommit.slice(0, 7)})`;
      } else {
        return { ok: true, attempts, last, reason: 'ok' };
      }
    } catch (error) {
      reason = `falha de conexão: ${error instanceof Error ? error.message : String(error)}`;
    }
    log(`tentativa ${attempts}: ${reason}`);
    if (now() + intervalMs > deadline) break;
    await sleep(intervalMs);
  }
  return { ok: false, attempts, last, reason };
}

export async function checkSite({ baseUrl, fetchImpl = fetch, requestTimeoutMs = 40_000 }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/login`, { signal: AbortSignal.timeout(requestTimeoutMs) });
  return { ok: res.status === 200, status: res.status };
}

async function main() {
  const baseUrl = process.env.DEMO_URL;
  if (!baseUrl) throw new Error('Defina DEMO_URL (por exemplo, https://itsm-demo-six.vercel.app).');
  const expectedCommit = process.env.EXPECTED_COMMIT ?? '';
  const timeoutMs = Number(process.env.WAIT_MINUTES ?? 12) * 60_000;

  const api = await waitForHealthy({ baseUrl, expectedCommit, timeoutMs, log: (line) => console.log(line) });
  const site = api.ok ? await checkSite({ baseUrl }).catch(() => ({ ok: false, status: 0 })) : { ok: false, status: 0 };

  const lines = [
    '## Verificação pós-deploy da demonstração',
    '',
    `| Item | Resultado |`,
    `|---|---|`,
    `| API e banco (\`/api/health\`) | ${api.ok ? 'no ar' : `falhou: ${api.reason}`} |`,
    `| Commit no ar | ${api.last?.commit ? String(api.last.commit).slice(0, 7) : 'não informado'} |`,
    `| Site (\`/login\`) | ${site.ok ? 'no ar' : `falhou (status ${site.status})`} |`,
    `| Tentativas | ${api.attempts} |`,
  ];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  if (!api.ok || !site.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
