export const slugify = (t) =>
  String(t || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const fmtDate = (d, withTime = false) =>
  d ? new Date(d).toLocaleString("en-GB", withTime ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }) : "";

export const fmtSize = (n) => (n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB");

// Turns a server / network error into a sentence a person can act on.
// The server already writes its messages for people, so they are shown as they are.
export function explain(err) {
  const m = (err && err.message) || String(err || "");
  if (/failed to fetch|networkerror/i.test(m)) return "Could not reach the server. Make sure it is running and try again.";
  return m || "Something went wrong. Please try again.";
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
