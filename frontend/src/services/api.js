const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SESSION_CODES = new Set(['AUTH_REQUIRED', 'SESSION_EXPIRED']);

let authToken = null;
let onSessionEnded = () => {};

export function setAuthToken(token) {
  authToken = token || null;
}

export function setSessionEndedHandler(handler) {
  onSessionEnded = typeof handler === 'function' ? handler : () => {};
}

async function request(path, { timeoutMs, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers },
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined
    });
  } catch (caught) {
    const timedOut = caught?.name === 'TimeoutError' || caught?.name === 'AbortError';
    const error = new Error(timedOut
      ? 'ShopSmart took too long to answer. Please try again.'
      : 'Could not reach the ShopSmart server. Check your connection and try again.');
    error.code = timedOut ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR';
    throw error;
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    error.details = data?.error?.details;
    if (response.status === 401 && authToken && SESSION_CODES.has(error.code)) onSessionEnded();
    throw error;
  }
  return data;
}

export const api = {
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  getOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  register: (account) => request('/auth/register', { method: 'POST', body: JSON.stringify(account) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question }), timeoutMs: 20_000
  })
};
