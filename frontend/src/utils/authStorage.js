const TOKEN_KEY = 'shopsmart.session';

function storage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export function readStoredToken() {
  try {
    return storage()?.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function storeToken(token) {
  try {
    if (token) storage()?.setItem(TOKEN_KEY, token);
    else storage()?.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}
