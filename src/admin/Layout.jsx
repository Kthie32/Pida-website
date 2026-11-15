import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Icon from "../components/Icon.jsx";
import { useAuth, ROLE_LABEL } from "./AuthContext.jsx";
import { changeMyPassword, newEnquiryCount } from "./api.js";
import { Field, Modal, useAsync, useToast } from "./ui.jsx";
import { explain } from "./utils.js";

function ChangePassword({ onClose }) {
  const toast = useToast();
  const [busy, run] = useAsync();
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const [err, setErr] = useState({});
  const submit = (e) => {
    e.preventDefault();
    const ve = {};
    if (!f.current) ve.current = "Enter your current password.";
    if (f.next.length < 8) ve.next = "Use at least 8 characters.";
    else if (f.next !== f.again) ve.again = "The two new passwords do not match.";
    setErr(ve);
    if (Object.keys(ve).length) return;
    run(async () => {
      try { await changeMyPassword(f.current, f.next); toast.success("Your password has been changed."); onClose(); }
      catch (er) { toast.error(explain(er)); }
    });
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal title="Change my password" onClose={onClose}>
      <form onSubmit={submit} noValidate className="ad-form">
        <Field label="Current password" id="cp-cur" error={err.current}><input id="cp-cur" type="password" autoComplete="current-password" value={f.current} onChange={set("current")} /></Field>
        <Field label="New password" id="cp-new" error={err.next} hint="At least 8 characters."><input id="cp-new" type="password" autoComplete="new-password" value={f.next} onChange={set("next")} /></Field>
        <Field label="New password again" id="cp-again" error={err.again}><input id="cp-again" type="password" autoComplete="new-password" value={f.again} onChange={set("again")} /></Field>
        <div className="ad-actions end"><button type="button" className="ad-btn" onClick={onClose}>Cancel</button><button className="ad-btn primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button></div>
      </form>
    </Modal>
  );
}

const ALL = ["super_admin", "admin", "editor"];
const ADMINS = ["super_admin", "admin"];
export const MENU = [
  { group: "Overview", items: [
    { to: "/admin", label: "Dashboard", icon: "dashboard", end: true, roles: ALL },
    { to: "/admin/enquiries", label: "Enquiries", icon: "inbox", roles: ADMINS, badge: true },
  ] },
  { group: "Content", items: [
    { to: "/admin/programmes", label: "Programmes", icon: "layers", roles: ALL },
    { to: "/admin/news", label: "News", icon: "news", roles: ALL },
    { to: "/admin/pages", label: "Pages & content", icon: "filetext", roles: ALL },
    { to: "/admin/media", label: "Media library", icon: "image", roles: ALL },
  ] },
  { group: "Team", items: [
    { to: "/admin/users", label: "Users & roles", icon: "shield", roles: ["super_admin"] },
    { to: "/admin/settings", label: "Settings", icon: "sliders", roles: ADMINS },
  ] },
];

const CRUMBS = { enquiries: "Enquiries", programmes: "Programmes", news: "News", pages: "Pages & content", media: "Media library", users: "Users & roles", settings: "Settings", new: "New" };

export default function Layout() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [pwOpen, setPwOpen] = useState(false);
  const isAdmin = ADMINS.includes(role);

  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);

  // The bell shows the real number of unread enquiries.
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    const refresh = () => newEnquiryCount().then((n) => alive && setNewCount(n)).catch(() => {});
    refresh();
    const t = setInterval(refresh, 60000);
    window.addEventListener("ad:refresh-counts", refresh);
    return () => { alive = false; clearInterval(t); window.removeEventListener("ad:refresh-counts", refresh); };
  }, [isAdmin, location.pathname]);

  const parts = location.pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const initials = (profile.full_name || profile.email).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className={"ad-shell" + (open ? " nav-open" : "")}>
      <aside className="ad-side" aria-label="Dashboard menu">
        <div className="ad-brand">
          <span className="ad-lg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21L12 3l8 18M8 15h8"/></svg></span>
          <span><b>PIDA Admin</b><small>Pearl Integrated Development Agency</small></span>
        </div>
        <div className="ad-menu" role="navigation">
          {MENU.map((g) => {
            const items = g.items.filter((i) => i.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <p className="ad-group">{g.group}</p>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => "ad-link" + (isActive ? " active" : "")}>
                    <Icon n={i.icon} s={18} /> <span>{i.label}</span>
                    {i.badge && newCount > 0 && <em className="ad-count">{newCount}</em>}
                  </NavLink>
                ))}
              </div>
            );
          })}
          <p className="ad-group">Website</p>
          <a className="ad-link" href="/" target="_blank" rel="noreferrer"><Icon n="external" s={18} /> <span>View website</span></a>
        </div>
        <div className="ad-user">
          <span className="ad-avatar">{initials}</span>
          <span className="ad-user-text"><b>{profile.full_name || "Administrator"}</b><small>{ROLE_LABEL[role]}</small></span>
        </div>
      </aside>
      {open && <button className="ad-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <div className="ad-main">
        <div className="ad-top">
          <button className="ad-icon-btn show-sm" onClick={() => setOpen(true)} aria-label="Open menu"><Icon n="menu" s={20} /></button>
          <div className="ad-crumbs" aria-label="Breadcrumb">
            <Link to="/admin"><Icon n="home" s={16} /></Link>
            <span>/</span>
            {parts.length === 0 ? <b>Dashboard</b> : parts.map((p, i) => (
              <span key={i}>{i === parts.length - 1 ? <b>{CRUMBS[p] || "Edit"}</b> : <Link to={"/admin/" + parts.slice(0, i + 1).join("/")}>{CRUMBS[p] || p}</Link>}{i < parts.length - 1 && <span> / </span>}</span>
            ))}
          </div>
          <div className="ad-top-right">
            {isAdmin && (
              <Link to="/admin/enquiries" className="ad-icon-btn" aria-label={newCount + " new enquiries"} title={newCount + " new enquiries"}>
                <Icon n="bell" s={18} />{newCount > 0 && <i className="ad-dot" />}
              </Link>
            )}
            <div className="ad-menu-wrap">
              <button className="ad-btn" onClick={() => setMenu(!menu)} aria-expanded={menu}>
                <span className="ad-avatar sm">{initials}</span> <span className="hide-sm">{profile.full_name || profile.email}</span> <Icon n="chevron" s={14} />
              </button>
              {menu && (
                <div className="ad-dropdown">
                  <div className="ad-dd-info"><b>{profile.full_name || "Administrator"}</b><small>{profile.email}</small></div>
                  <button onClick={() => { setMenu(false); setPwOpen(true); }}><Icon n="shield" s={16} /> Change my password</button>
                  <button onClick={signOut}><Icon n="logout" s={16} /> Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <main className="ad-content"><Outlet /></main>
        {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
      </div>
    </div>
  );
}
