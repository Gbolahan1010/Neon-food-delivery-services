import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import { ErrorMessage } from '../components/Feedback';

/** Where each kind of account lands after logging in, unless it was sent here from a page. */
export const HOME_FOR_ROLE = { customer: '/', owner: '/owner', admin: '/admin' };

/** The page that sent the visitor here, if this account is allowed to use it. */
export function returnPath(state, user) {
  if (!state?.from) return null;
  return !state.roles || state.roles.includes(user.role) ? state.from : null;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(returnPath(location.state, user) || HOME_FOR_ROLE[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const fieldErrors = error?.fieldErrors || {};

  return (
    <div className="auth-page">
      <h1>Log in</h1>
      <form onSubmit={submit} noValidate className="card-plain">
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={change('email')} error={fieldErrors.email} />
        <Field label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={change('password')} error={fieldErrors.password} />
        {error && !error.errors?.length && <ErrorMessage error={error} />}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p>
        New here? <Link to="/register" state={location.state}>Create an account</Link>
      </p>
      <details className="demo-logins">
        <summary>Demo accounts for marking</summary>
        <p>
          Password for all: <code>NeonDemo123</code>
        </p>
        <ul>
          <li>Customer: customer@neon.test</li>
          <li>Restaurant owner: owner@neon.test</li>
          <li>Admin: admin@neon.test</li>
        </ul>
      </details>
    </div>
  );
}
