import { useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useAuth, ROLE_LABEL } from "../AuthContext.jsx";
import { addAdmin, listProfiles, updateProfile } from "../api.js";
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { EMAIL_RE, explain, fmtDate } from "../utils.js";

function AddAdmin({ onClose, onAdded }) {
  const toast = useToast();
  const [busy, run] = useAsync();
  const [f, setF] = useState({ email: "", full_name: "", role: "editor", password: "" });
  const [err, setErr] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const ve = {};
    if (!EMAIL_RE.test(f.email.trim())) ve.email = "Enter a valid email address.";
    if (f.full_name.trim().length < 2) ve.full_name = "Enter the person's name.";
    if (f.password.length < 8) ve.password = "Use at least 8 characters.";
    setErr(ve);
    if (Object.keys(ve).length) return;
    run(async () => {
      try { await addAdmin({ email: f.email.trim().toLowerCase(), full_name: f.full_name.trim(), role: f.role, password: f.password }); toast.success("Account created. Share the password with them privately."); onAdded(); onClose(); }
      catch (er) { toast.error(explain(er)); }
    });
  };
  return (
    <Modal title="Add an account" onClose={onClose}>
      <p className="ad-note">This creates the person's login. Give them the email and password privately; they can change the password after signing in.</p>
      <form onSubmit={submit} noValidate className="ad-form">
        <Field label="Email" id="au-email" error={err.email}><input id="au-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Full name" id="au-name" error={err.full_name}><input id="au-name" value={f.full_name} maxLength={120} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Password" id="au-pass" error={err.password} hint="At least 8 characters."><input id="au-pass" type="text" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Role" id="au-role" hint="Editors write drafts. Administrators publish and see enquiries. Super administrators also manage accounts.">
          <select id="au-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="ad-actions end"><button type="button" className="ad-btn" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? "Creating…" : "Create account"}</button></div>
      </form>
    </Modal>
  );
}

function SetPassword({ person, onClose }) {
  const toast = useToast();
  const [busy, run] = useAsync();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    run(async () => {
      try { await updateProfile(person.id, { password: pw }); toast.success("Password changed. They have been signed out everywhere."); onClose(); }
      catch (er) { toast.error(explain(er)); }
    });
  };
  return (
    <Modal title={"Set a new password for " + (person.full_name || person.email)} onClose={onClose}>
      <form onSubmit={submit} noValidate className="ad-form">
        <Field label="New password" id="sp-pass" error={err} hint="At least 8 characters. Share it with them privately."><input id="sp-pass" type="text" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(""); }} /></Field>
        <div className="ad-actions end"><button type="button" className="ad-btn" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? "Saving…" : "Set password"}</button></div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const [adding, setAdding] = useState(false);
  const [pwFor, setPwFor] = useState(null);
  const { loading, data, error, reload } = useLoad(listProfiles);

  const change = (p, patch, okMsg) => run(async () => {
    try { await updateProfile(p.id, patch); toast.success(okMsg); reload(); } catch (e) { toast.error(explain(e)); reload(); }
  });
  const toggleActive = async (p) => {
    if (p.is_active && !(await confirm({ title: "Switch off this account?", message: `${p.full_name || p.email} will no longer be able to open the dashboard.`, confirmLabel: "Switch off", danger: true }))) return;
    change(p, { is_active: !p.is_active }, p.is_active ? "Account switched off." : "Account switched on.");
  };

  return (
    <>
      <PageHeader title="Users & roles" subtitle="Who can sign in to this dashboard. Only super administrators can change this page."
        actions={<button className="ad-btn primary" onClick={() => setAdding(true)}><Icon n="plus" s={16} /> Add account</button>} />
      <div className="ad-card">
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : data.length === 0 ? <Empty icon="shield" title="No administrators" /> : (
          <div className="ad-tablewrap"><table className="ad-table">
            <thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Added</th><th className="r">Actions</th></tr></thead>
            <tbody>{data.map((p) => {
              const me = p.id === user.id;
              return (
                <tr key={p.id}>
                  <td><b>{p.full_name || "—"}</b>{me && <Badge tone="grey">You</Badge>}<small>{p.email}</small></td>
                  <td>
                    <select aria-label={"Role for " + (p.full_name || p.email)} value={p.role} disabled={busy || me} onChange={(e) => change(p, { role: e.target.value }, "Role updated.")}>
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td><Badge tone={p.is_active ? "green" : "grey"}>{p.is_active ? "Active" : "Switched off"}</Badge></td>
                  <td>{fmtDate(p.created_at)}</td>
                  <td className="r ad-actions end"><button className="ad-btn sm" disabled={busy} onClick={() => setPwFor(p)}>Set password</button>{!me && <button className="ad-btn sm" disabled={busy} onClick={() => toggleActive(p)}>{p.is_active ? "Switch off" : "Switch on"}</button>}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
      {adding && <AddAdmin onClose={() => setAdding(false)} onAdded={reload} />}
      {pwFor && <SetPassword person={pwFor} onClose={() => setPwFor(null)} />}
    </>
  );
}
