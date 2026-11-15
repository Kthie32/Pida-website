import { useEffect, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { deleteEnquiry, listEnquiries, listProfiles, updateEnquiry } from "../api.js";
import { Badge, Empty, ErrorBox, Field, Loading, Modal, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { explain, fmtDate } from "../utils.js";

const STATUSES = [["new", "New"], ["read", "Read"], ["in_progress", "In progress"], ["resolved", "Resolved"], ["archived", "Archived"]];
const LABEL = Object.fromEntries(STATUSES);
const PAGE = 12;
const refreshBell = () => window.dispatchEvent(new Event("ad:refresh-counts"));

function Detail({ item, staff, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const [form, setForm] = useState({ status: item.status, assigned_to: item.assigned_to || "", internal_notes: item.internal_notes });

  // Opening a new enquiry marks it as read.
  useEffect(() => {
    if (item.status === "new") {
      updateEnquiry(item.id, { status: "read" }).then((r) => { setForm((f) => ({ ...f, status: "read" })); onChanged(r, true); refreshBell(); }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => run(async () => {
    try {
      const r = await updateEnquiry(item.id, { status: form.status, assigned_to: form.assigned_to || null, internal_notes: form.internal_notes.trim() });
      toast.success("Enquiry updated.");
      onChanged(r); refreshBell(); onClose();
    } catch (e) { toast.error(explain(e)); }
  });
  const remove = async () => {
    if (!(await confirm({ title: "Delete this enquiry?", message: "It will be removed permanently and cannot be recovered.", confirmLabel: "Delete", danger: true }))) return;
    run(async () => {
      try { await deleteEnquiry(item.id); toast.success("Enquiry deleted."); onChanged(null); refreshBell(); onClose(); }
      catch (e) { toast.error(explain(e)); }
    });
  };

  return (
    <Modal title="Enquiry" onClose={onClose} wide>
      <div className="ad-detail">
        <div>
          <p className="ad-muted">Received {fmtDate(item.created_at, true)}</p>
          <h3>{item.name}</h3>
          <p><a href={"mailto:" + item.email}>{item.email}</a>{item.interest && <> · <Badge tone="grey">{item.interest}</Badge></>}</p>
          <div className="ad-message">{item.message}</div>
          <a className="ad-btn" href={`mailto:${item.email}?subject=${encodeURIComponent("Your message to PIDA")}`}><Icon n="mail" s={16} /> Reply by email</a>
        </div>
        <div>
          <Field label="Status" id="en-status">
            <select id="en-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Assigned to" id="en-assign">
            <select id="en-assign" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">Nobody</option>
              {staff.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
          </Field>
          <Field label="Internal notes (never shown to the visitor)" id="en-notes" hint={form.internal_notes.length + " / 5000"}>
            <textarea id="en-notes" rows="5" maxLength={5000} value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
          </Field>
        </div>
      </div>
      <div className="ad-actions between">
        <button className="ad-btn danger-o" onClick={remove} disabled={busy}><Icon n="trash" s={16} /> Delete</button>
        <div className="ad-actions">
          <button className="ad-btn" onClick={onClose}>Close</button>
          <button className="ad-btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </Modal>
  );
}

export default function Enquiries() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const staff = useLoad(listProfiles, []);
  const { loading, data, error, reload } = useLoad(() => listEnquiries({ status, q: term, page, pageSize: PAGE }), [status, term, page]);

  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(0); }, 350); return () => clearTimeout(t); }, [q]);
  const pages = data ? Math.max(1, Math.ceil(data.count / PAGE)) : 1;
  const staffList = (staff.data || []).filter((p) => p.is_active && p.role !== "editor");

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Messages sent through the website's contact form. Only administrators can see them." />
      <div className="ad-card">
        <div className="ad-toolbar">
          <div className="ad-tabs" role="tablist">
            {[["all", "All"], ...STATUSES].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={status === v} className={status === v ? "on" : ""} onClick={() => { setStatus(v); setPage(0); }}>{l}</button>
            ))}
          </div>
          <div className="ad-search"><Icon n="search" s={16} /><input type="search" placeholder="Search name, email or message" aria-label="Search enquiries" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : data.rows.length === 0 ? (
          <Empty icon="inbox" title={term || status !== "all" ? "No enquiries match" : "No enquiries yet"} text={term || status !== "all" ? "Try another filter or search." : "When someone sends a message from the contact form it will appear here."} />
        ) : (
          <>
            <div className="ad-tablewrap"><table className="ad-table clickable">
              <thead><tr><th>From</th><th>Topic</th><th>Message</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>{data.rows.map((e) => (
                <tr key={e.id} tabIndex={0} onClick={() => setOpen(e)} onKeyDown={(ev) => ev.key === "Enter" && setOpen(e)} className={e.status === "new" ? "unread" : ""}>
                  <td><b>{e.name}</b><small>{e.email}</small></td><td>{e.interest || "—"}</td>
                  <td className="ad-clip">{e.message}</td><td><Badge>{LABEL[e.status]}</Badge></td><td>{fmtDate(e.created_at, true)}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <div className="ad-pager">
              <span className="ad-muted">{data.count} enquir{data.count === 1 ? "y" : "ies"}</span>
              <div className="ad-actions">
                <button className="ad-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {page + 1} of {pages}</span>
                <button className="ad-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
      {open && <Detail item={open} staff={staffList} onClose={() => setOpen(null)} onChanged={(r, quiet) => { if (!quiet) reload(); else reload(); }} />}
    </>
  );
}
