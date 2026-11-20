import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, trustProxySetting } from '../src/app.js';
import { createSessionToken, hashPassword, hashToken, readBearerToken, toPublicUser, verifyPassword } from '../src/services/auth.js';
import { loginSchema, registerSchema } from '../src/validators/schemas.js';

async function send(path, { method = 'GET', body, headers = {} } = {}) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  } finally {
    server.close();
  }
}

test('a password hash verifies the right password and rejects a wrong one', async () => {
  const stored = await hashPassword('correct horse battery');
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.doesNotMatch(stored, /correct horse battery/);
  assert.equal(await verifyPassword('correct horse battery', stored), true);
  assert.equal(await verifyPassword('correct horse batterY', stored), false);
});

test('the same password gets a different salt each time', async () => {
  assert.notEqual(await hashPassword('same password'), await hashPassword('same password'));
});

test('a missing or corrupt stored hash never verifies', async () => {
  assert.equal(await verifyPassword('anything', undefined), false);
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(await verifyPassword('anything', 'plain-text-password'), false);
  assert.equal(await verifyPassword('anything', 'scrypt$$'), false);
});

test('session tokens are random and only their hash is stored', () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(hashToken(first), hashToken(first));
  assert.notEqual(hashToken(first), first);
  assert.match(hashToken(first), /^[0-9a-f]{64}$/);
});

test('only a well-formed Bearer header yields a token', () => {
  const token = createSessionToken();
  assert.equal(readBearerToken(`Bearer ${token}`), token);
  assert.equal(readBearerToken(`bearer ${token}`), null);
  assert.equal(readBearerToken(`Basic ${token}`), null);
  assert.equal(readBearerToken('Bearer short'), null);
  assert.equal(readBearerToken(undefined), null);
});

test('the public user never includes the password hash', () => {
  assert.deepEqual(toPublicUser({ id: 7, name: 'Ana Reyes', email: 'ana@example.com', passwordHash: 'scrypt$x$y' }), { id: 7, name: 'Ana Reyes', email: 'ana@example.com' });
});

test('registration normalizes the email and requires an 8-character password', () => {
  const valid = registerSchema.safeParse({ name: 'Ana Reyes', email: ' Ana@Example.COM ', password: 'longenough' });
  assert.equal(valid.success, true);
  assert.equal(valid.data.email, 'ana@example.com');
  assert.equal(registerSchema.safeParse({ name: 'Ana Reyes', email: 'ana@example.com', password: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Ana Reyes', email: 'ana@example', password: 'longenough' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'ANA@example.com', password: 'x' }).data.email, 'ana@example.com');
});

test('TRUST_PROXY accepts only a positive hop count', () => {
  assert.equal(trustProxySetting('1'), 1);
  assert.equal(trustProxySetting('2'), 2);
  assert.equal(trustProxySetting(undefined), false);
  assert.equal(trustProxySetting('0'), false);
  assert.equal(trustProxySetting('true'), false);
});

test('a guest cannot list orders, read an order, place an order, or read the account', async () => {
  for (const [method, path, body] of [['GET', '/api/orders'], ['GET', '/api/orders/1'], ['POST', '/api/orders', { items: [] }], ['GET', '/api/auth/me'], ['POST', '/api/auth/logout']]) {
    const { status, body: response } = await send(path, { method, body });
    assert.equal(status, 401, `${method} ${path}`);
    assert.equal(response.error.code, 'AUTH_REQUIRED', `${method} ${path}`);
  }
});

test('a non-Bearer Authorization header is treated as a guest', async () => {
  const { status, body } = await send('/api/orders', { headers: { Authorization: 'Basic YW5hOnNlY3JldA==' } });
  assert.equal(status, 401);
  assert.equal(body.error.code, 'AUTH_REQUIRED');
});

test('invalid registration and login input returns HTTP 422 before any database lookup', async () => {
  const register = await send('/api/auth/register', { method: 'POST', body: { name: 'A', email: 'bad', password: 'short' } });
  assert.equal(register.status, 422);
  assert.equal(register.body.error.code, 'INVALID_ACCOUNT');
  assert.deepEqual(Object.keys(register.body.error.details.fieldErrors).sort(), ['email', 'name', 'password']);
  const login = await send('/api/auth/login', { method: 'POST', body: { email: '', password: '' } });
  assert.equal(login.status, 422);
  assert.equal(login.body.error.code, 'INVALID_LOGIN');
});
