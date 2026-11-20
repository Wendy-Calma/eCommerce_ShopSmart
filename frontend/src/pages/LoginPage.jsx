import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { describeAccountError } from '../utils/checkout.js';

export default function LoginPage() {
  const { user, signIn, register, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || '/';
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={returnTo} replace />;

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function switchMode() {
    setMode((current) => (current === 'signin' ? 'register' : 'signin'));
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') await signIn({ email: form.email, password: form.password });
      else await register(form);
      navigate(returnTo, { replace: true });
    } catch (caught) {
      setError(describeAccountError(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const creating = mode === 'register';

  return (
    <section className="auth-layout">
      <form onSubmit={submit}>
        <p className="eyebrow">{creating ? 'NEW CUSTOMER' : 'WELCOME BACK'}</p>
        <h1>{creating ? 'Create an account' : 'Sign in'}</h1>
        <StatusMessage>{sessionMessage}</StatusMessage>
        <StatusMessage type="error">{error}</StatusMessage>
        {creating && <label>Full name<input name="name" value={form.name} onChange={updateField} minLength="2" maxLength="80" autoComplete="name" required /></label>}
        <label>Email address<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={updateField} minLength={creating ? 8 : 1} maxLength="128" autoComplete={creating ? 'new-password' : 'current-password'} required /></label>
        {creating && <small>Use at least 8 characters. This is a classroom demo: use fictional details and a password you do not use anywhere else.</small>}
        <button disabled={submitting}>{submitting ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="secondary" onClick={switchMode}>
          {creating ? 'I already have an account' : 'Create a new account'}
        </button>
      </form>
    </section>
  );
}
