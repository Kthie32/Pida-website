import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icon from "../components/Icon.jsx";

// Small shared building blocks for the dashboard: notifications, confirmation dialogs, badges, etc.

// ---------- Toasts (success / error notifications) ----------
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((tone, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, tone, text }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  const api = useRef({ success: (t) => push("success", t), error: (t) => push("error", t) }).current;
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="ad-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={"ad-toast " + t.tone} role={t.tone === "error" ? "alert" : "status"}>
            <Icon n={t.tone === "error" ? "alert" : "check"} s={18} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confirm dialog:  if (await confirm({...})) { ... } ----------
const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const close = (v) => { dlg.resolve(v); setDlg(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {dlg && (
        <Modal title={dlg.title || "Are you sure?"} onClose={() => close(false)} small>
          <p>{dlg.message}</p>
          <div className="ad-actions end">
            <button className="ad-btn" onClick={() => close(false)}>Cancel</button>
            <button className={"ad-btn " + (dlg.danger ? "danger" : "primary")} onClick={() => close(true)} autoFocus>
              {dlg.confirmLabel || "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, children, wide, small }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ad-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"ad-modal" + (wide ? " wide" : "") + (small ? " small" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ad-modal-head">
          <h2>{title}</h2>
          <button className="ad-icon-btn" onClick={onClose} aria-label="Close"><Icon n="x" s={18} /></button>
        </div>
        <div className="ad-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Layout bits ----------
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ad-pagehead">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ad-actions">{actions}</div>}
    </div>
  );
}

export const Spinner = () => <span className="ad-spin" role="status" aria-label="Loading" />;

export function Loading({ label = "Loading…" }) {
  return <div className="ad-loading"><Spinner /> {label}</div>;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="ad-error" role="alert">
      <Icon n="alert" s={20} />
      <div>
        <strong>Something went wrong</strong>
        <p>{typeof error === "string" ? error : error?.message}</p>
        {onRetry && <button className="ad-btn" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  );
}

export function Empty({ icon = "inbox", title, text, action }) {
  return (
    <div className="ad-empty">
      <div className="ad-empty-ic"><Icon n={icon} s={26} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

const TONES = { published: "green", draft: "grey", archived: "dark", new: "red", read: "grey", in_progress: "amber", resolved: "green" };
export function Badge({ children, tone }) {
  return <span className={"ad-badge " + (tone || TONES[String(children).toLowerCase().replace(" ", "_")] || "grey")}>{children}</span>;
}

// Label + input + error message wrapper
export function Field({ label, error, hint, children, id }) {
  return (
    <div className={"ad-field" + (error ? " has-error" : "")}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && !error && <small className="ad-hint">{hint}</small>}
      {error && <small className="ad-err" role="alert">{error}</small>}
    </div>
  );
}

// Run an async action with a "busy" flag
export function useAsync() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  }, []);
  return [busy, run];
}

// Load data on mount and on demand
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try { setState({ loading: false, data: await fn(), error: null }); }
    catch (e) { setState({ loading: false, data: null, error: e }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}
