import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, mergeBlock } from "../../data/blocks.js";
import { useAuth } from "../AuthContext.jsx";
import { listSettings, saveSetting } from "../api.js";
import { ErrorBox, Field, Loading, PageHeader, useAsync, useLoad, useToast } from "../ui.jsx";
import { EMAIL_RE, explain } from "../utils.js";

// Organisation name and contact details shown in the header, contact section and footer.
export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, run] = useAsync();
  const { loading, data, error, reload } = useLoad(listSettings);
  const [f, setF] = useState(null);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (!data) return;
    const get = (k) => data.find((x) => x.key === k)?.value;
    const org = mergeBlock(DEFAULT_SETTINGS.organisation, get("organisation"));
    const con = mergeBlock(DEFAULT_SETTINGS.contact, get("contact"));
    setF({ name: org.name, short_name: org.short_name, phone: con.phone, email: con.email, address: con.address });
  }, [data]);

  if (loading || !f) return error ? <ErrorBox error={explain(error)} onRetry={reload} /> : <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = (e) => {
    e.preventDefault();
    const ve = {};
    if (f.name.trim().length < 2) ve.name = "Enter the organisation's name.";
    if (f.short_name.trim().length < 1 || f.short_name.trim().length > 12) ve.short_name = "Enter a short name of up to 12 characters.";
    if (f.phone.trim().length < 5 || f.phone.length > 40) ve.phone = "Enter a phone number.";
    if (!EMAIL_RE.test(f.email.trim())) ve.email = "Enter a valid email address.";
    if (f.address.trim().length < 5 || f.address.length > 300) ve.address = "Enter the address (up to 300 characters).";
    setErr(ve);
    if (Object.keys(ve).length) { toast.error("Please fix the highlighted fields."); return; }
    run(async () => {
      try {
        await saveSetting("organisation", { name: f.name.trim(), short_name: f.short_name.trim() }, user.id);
        await saveSetting("contact", { phone: f.phone.trim(), email: f.email.trim(), address: f.address.trim() }, user.id);
        toast.success("Settings saved. The website now shows these details.");
        reload();
      } catch (e2) { toast.error(explain(e2)); }
    });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Shown in the top bar, the contact section and the footer of the website." />
      <form className="ad-card ad-form" onSubmit={save} noValidate>
        <div className="ad-grid2">
          <Field label="Organisation name" id="st-name" error={err.name}><input id="st-name" value={f.name} maxLength={120} onChange={set("name")} /></Field>
          <Field label="Short name" id="st-short" error={err.short_name}><input id="st-short" value={f.short_name} maxLength={12} onChange={set("short_name")} /></Field>
        </div>
        <div className="ad-grid2">
          <Field label="Phone" id="st-phone" error={err.phone}><input id="st-phone" value={f.phone} maxLength={40} onChange={set("phone")} /></Field>
          <Field label="Email" id="st-email" error={err.email}><input id="st-email" type="email" value={f.email} onChange={set("email")} /></Field>
        </div>
        <Field label="Address" id="st-addr" error={err.address}><textarea id="st-addr" rows="3" maxLength={300} value={f.address} onChange={set("address")} /></Field>
        <div className="ad-actions end"><button className="ad-btn primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button></div>
      </form>
    </>
  );
}
