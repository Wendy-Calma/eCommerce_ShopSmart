import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAuthToken, setSessionEndedHandler } from './api.js';

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  setAuthToken(null);
  setSessionEndedHandler(null);
  vi.unstubAllGlobals();
});

describe('api client sign-in handling', () => {
  it('sends no Authorization header for a guest', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { products: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await api.getProducts();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('sends the Bearer token after sign-in', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { orders: [] }));
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('token-abc');
    await api.getOrders();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer token-abc');
  });

  it('ends the session when a signed-in request gets SESSION_EXPIRED', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: { code: 'SESSION_EXPIRED', message: 'Your session has ended. Please sign in again.' } })));
    const ended = vi.fn();
    setSessionEndedHandler(ended);
    setAuthToken('token-abc');
    await expect(api.getOrders()).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
    expect(ended).toHaveBeenCalledTimes(1);
  });

  it('does not end a session for a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS', message: 'The email or password is incorrect.' } })));
    const ended = vi.fn();
    setSessionEndedHandler(ended);
    await expect(api.login({ email: 'ana@example.com', password: 'wrong' })).rejects.toThrow('The email or password is incorrect.');
    expect(ended).not.toHaveBeenCalled();
  });

  it('treats an empty 204 logout response as success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    setAuthToken('token-abc');
    await expect(api.logout()).resolves.toBeNull();
  });
});
