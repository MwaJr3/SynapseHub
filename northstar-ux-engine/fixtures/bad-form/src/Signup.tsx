import { useState } from 'react';

/**
 * Fixture: a sign-up form with four defects the engine should find.
 * It is intentionally wrong, and it is small enough that the expected
 * findings can be listed exactly in the test file.
 */
export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      alert('Password too short');
      return;
    }
    setBusy(true);
    await fetch('/api/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-semibold">Create an account</h1>
      <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className="input"
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button className="btn-primary" disabled={!email.trim()}>
        Sign up
      </button>
      {busy ? <p className="text-sm text-slate-500">Loading...</p> : null}
    </form>
  );
}
