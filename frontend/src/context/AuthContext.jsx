import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setSessionEndedHandler } from '../services/api.js';
import { readStoredToken, storeToken } from '../utils/authStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(readStoredToken()));
  const [sessionMessage, setSessionMessage] = useState('');

  const endSession = useCallback((message = '') => {
    setAuthToken(null);
    storeToken(null);
    setUser(null);
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    setSessionEndedHandler(() => endSession('Your session has ended. Please sign in again.'));
    const token = readStoredToken();
    if (!token) return undefined;
    let active = true;
    setAuthToken(token);
    api.getCurrentUser()
      .then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) endSession(); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [endSession]);

  const startSession = useCallback(({ token, user: signedIn }) => {
    setAuthToken(token);
    storeToken(token);
    setUser(signedIn);
    setSessionMessage('');
  }, []);

  const signIn = useCallback(async (credentials) => startSession(await api.login(credentials)), [startSession]);
  const register = useCallback(async (account) => startSession(await api.register(account)), [startSession]);
  const signOut = useCallback(async () => {
    await api.logout().catch(() => null);
    endSession();
  }, [endSession]);

  const value = useMemo(() => ({ user, checking, sessionMessage, signIn, register, signOut }), [user, checking, sessionMessage, signIn, register, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
