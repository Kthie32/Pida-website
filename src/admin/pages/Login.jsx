import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LOGO } from "../../data/images.js";
import { useAuth } from "../AuthContext.jsx";
import { Field, Spinner } from "../ui.jsx";
import { explain } from "../utils.js";

export default function Login() {
  const { user, loading, signIn, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErr, setFieldErr] = useState({});

  if (user) return <Navigate to={location.state?.from || "/admin"} replace />;

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) fe.email = "Enter your email address.";
    if (password.length < 1) fe.password = "Enter your password.";
    setFieldErr(fe);
    setError("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login-card">
        <img src={LOGO} alt="PIDA" width="72" height="72" />
        <h1>Website admin</h1>
        <p className="ad-muted">Sign in to manage the PIDA website.</p>
        {(
          <form onSubmit={submit} noValidate>
            {(error || notice) && <div className="ad-error" role="alert"><p>{error || notice}</p></div>}
            <Field label="Email" id="lg-email" error={fieldErr.email}>
              <input id="lg-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
            </Field>
            <Field label="Password" id="lg-pass" error={fieldErr.password}>
              <input id="lg-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
            </Field>
            <button className="ad-btn primary block" type="submit" disabled={busy || loading}>
              {busy ? <><Spinner /> Signing in…</> : "Sign in"}
            </button>
          </form>
        )}
        <p className="ad-muted small">There is no public sign-up. Accounts are created by a super administrator.</p>
        <a className="ad-muted small" href="/">← Back to the website</a>
      </div>
    </div>
  );
}
