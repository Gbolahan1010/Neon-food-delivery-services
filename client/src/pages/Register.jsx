import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Field from '../components/Field';
import { ErrorMessage } from '../components/Feedback';
import { HOME_FOR_ROLE, returnPath } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await register({ ...form, name: form.name.trim(), email: form.email.trim() });
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
      <h1>Create an account</h1>
      <form onSubmit={submit} noValidate className="card-plain">
        <fieldset className="role-choice">
          <legend>I want to</legend>
          <label>
            <input type="radio" name="role" value="customer" checked={form.role === 'customer'} onChange={change('role')} />
            Order food
          </label>
          <label>
            <input type="radio" name="role" value="owner" checked={form.role === 'owner'} onChange={change('role')} />
            Sell food from my restaurant
          </label>
        </fieldset>
        <Field label="Your name" autoComplete="name" required value={form.name} onChange={change('name')} error={fieldErrors.name} />
        <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={change('email')} error={fieldErrors.email} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with a letter and a number."
          value={form.password}
          onChange={change('password')}
          error={fieldErrors.password}
        />
        {error && !error.errors?.length && <ErrorMessage error={error} />}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login" state={location.state}>Log in</Link>
      </p>
    </div>
  );
}
