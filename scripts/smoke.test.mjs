import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSite, waitForHealthy } from './smoke.mjs';

const json = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status }));
// Relógio e espera falsos: o teste anda no tempo sem esperar de verdade.
function clock() {
  let t = 0;
  return { now: () => t, sleep: async (ms) => void (t += ms) };
}
const healthy = { status: 'ok', database: 'up', uptime: 5, commit: 'abc1234def' };

test('passa quando a API responde com o banco de pé', async () => {
  const r = await waitForHealthy({ baseUrl: 'https://x.test', fetchImpl: () => json(200, healthy), ...clock() });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 1);
});

test('espera a API acordar (503 e erro de rede antes de responder)', async () => {
  const answers = [() => json(503, {}), () => Promise.reject(new Error('timeout')), () => json(200, healthy)];
  const r = await waitForHealthy({ baseUrl: 'https://x.test', fetchImpl: () => answers.shift()(), ...clock() });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 3);
});

test('espera o commit esperado aparecer depois do deploy', async () => {
  const answers = [() => json(200, { ...healthy, commit: 'velho000' }), () => json(200, { ...healthy, commit: null }), () => json(200, healthy)];
  const r = await waitForHealthy({
    baseUrl: 'https://x.test',
    expectedCommit: 'abc1234',
    fetchImpl: () => answers.shift()(),
    ...clock(),
  });
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 3);
});

test('falha com motivo claro quando o commit esperado nunca chega', async () => {
  const r = await waitForHealthy({
    baseUrl: 'https://x.test',
    expectedCommit: 'abc1234',
    timeoutMs: 60_000,
    intervalMs: 15_000,
    fetchImpl: () => json(200, { ...healthy, commit: 'velho000' }),
    ...clock(),
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /velho000.*abc1234/);
});

test('falha quando o banco está fora, mesmo com a API respondendo 200', async () => {
  const r = await waitForHealthy({
    baseUrl: 'https://x.test',
    timeoutMs: 30_000,
    fetchImpl: () => json(200, { status: 'ok', database: 'down' }),
    ...clock(),
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /banco/);
});

test('checkSite exige 200 em /login', async () => {
  assert.deepEqual(await checkSite({ baseUrl: 'https://x.test/', fetchImpl: () => json(200, {}) }), { ok: true, status: 200 });
  assert.deepEqual(await checkSite({ baseUrl: 'https://x.test', fetchImpl: () => json(502, {}) }), { ok: false, status: 502 });
});
