import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function send(path, { method = 'GET', body } = {}) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body });
    return { status: response.status, requestId: response.headers.get('x-request-id'), body: await response.json() };
  } finally {
    server.close();
  }
}

test('GET /api/health reports ok', async () => {
  const { status, body } = await send('/api/health');
  assert.equal(status, 200);
  assert.deepEqual(body, { status: 'ok' });
});

test('malformed JSON returns HTTP 400 INVALID_JSON with a trace id and no parser internals', async () => {
  const { status, requestId, body } = await send('/api/orders', { method: 'POST', body: '{bad' });
  assert.equal(status, 400);
  assert.equal(body.error.code, 'INVALID_JSON');
  assert.equal(body.error.message, 'Request body must be valid JSON.');
  assert.ok(requestId);
  assert.equal(body.error.traceId, requestId);
});

test('an oversized body returns HTTP 413 PAYLOAD_TOO_LARGE', async () => {
  const { status, body } = await send('/api/assistant/questions', { method: 'POST', body: JSON.stringify({ question: 'x'.repeat(200_000) }) });
  assert.equal(status, 413);
  assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
});

test('an unknown API route returns HTTP 404 ROUTE_NOT_FOUND', async () => {
  const { status, body } = await send('/api/does-not-exist');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'ROUTE_NOT_FOUND');
});
