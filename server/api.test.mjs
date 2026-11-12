import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiHandler, validateInput, validateOutput } from './index.mjs';
const input = { specialty: 'عمومی', patient: { age: 30, gender: 'زن' }, questions: [{ id: 'meds', label: 'دارو', section: 'شرح حال' }], answers: { meds: { value: 'نمی‌دانم', note: '', skipped: false } }, attachmentCount: 0 };
const output = { summary: 'داروی مصرفی مشخص نیست.', topics: [{ id: 'meds', title: 'دارو', summary: 'نیازمند بررسی', detail: 'بیمار نام دارو را نمی‌داند.', tone: 'info' }], flags: [] };
test('strict validation retains uncertainty and rejects missing topic', () => {
  assert.ok(validateInput(input));
  assert.equal(validateInput({ ...input, attachmentCount: 6 }), null);
  assert.ok(validateOutput(output, input));
  assert.equal(validateOutput({ ...output, topics: [] }, input), null);
});
test('API calls model with server-only key and returns validated output', async () => {
  let body;
  const handler = createApiHandler({ env: { AI_API_KEY: 'test-only', AI_MODEL: 'test-model' }, fetchImpl: async (_, init) => {
    assert.equal(init.headers.Authorization, 'Bearer test-only');
    body = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(output) } }] }));
  } });
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/intake/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).model, 'test-model');
    assert.equal(body.messages[1].content, JSON.stringify(input));
  } finally { await new Promise(resolve => server.close(resolve)); }
});
