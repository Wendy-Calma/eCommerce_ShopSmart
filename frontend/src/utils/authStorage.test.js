import { afterEach, describe, expect, it, vi } from 'vitest';
import { readStoredToken, storeToken } from './authStorage.js';
import { describeAccountError } from './checkout.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('session token storage', () => {
  it('stores, reads and clears the token', () => {
    vi.stubGlobal('sessionStorage', memoryStorage());
    expect(readStoredToken()).toBeNull();
    storeToken('token-abc');
    expect(readStoredToken()).toBe('token-abc');
    storeToken(null);
    expect(readStoredToken()).toBeNull();
  });

  it('keeps working when the browser blocks storage', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); }
    });
    expect(() => storeToken('token-abc')).not.toThrow();
    expect(readStoredToken()).toBeNull();
  });
});

describe('describeAccountError', () => {
  it('names the account fields the server rejected', () => {
    const error = Object.assign(new Error('Check your name, email and password (at least 8 characters).'), {
      details: { fieldErrors: { email: ['Invalid email address'], password: ['Too small'] } }
    });
    expect(describeAccountError(error)).toBe('Check your name, email and password (at least 8 characters). Please correct: email address, password.');
  });

  it('keeps a plain sign-in message unchanged', () => {
    expect(describeAccountError(new Error('The email or password is incorrect.'))).toBe('The email or password is incorrect.');
  });
});
