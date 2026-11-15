// PIDA website server: serves the website, the admin dashboard API and uploaded files,
// backed by the SQLite database in server/data/pida.db.
//
//   npm run server   -> API only (use together with "npm run dev" while editing the site)
//   npm start        -> builds the site and serves EVERYTHING at http://localhost:3000
import express from "express";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { db, UPLOAD_DIR, all, one, run, insert, update, now, uuid } from "./db.js";
import {
  COOKIE, createSession, endSession, endAllSessions, hashPassword, passwordProblem,
  publicUser, readCookie, userFromToken, verifyPassword,
} from "./auth.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "dist");
const PORT = Number(process.env.PORT) || 3000;
const PROD = process.env.NODE_ENV === "production";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

// ---------------------------------------------------------------- helpers
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const NOT_ALLOWED = "You do not have permission to do this.";

const ROLES = ["super_admin", "admin", "editor"];
const STATUSES = ["draft", "published", "archived"];
const ENQ_STATUSES = ["new", "read", "in_progress", "resolved", "archived"];
const INTERESTS = ["Volunteering", "Partnership", "Donating", "Something else"];
const ICONS = ["book", "briefcase", "star", "home", "heart", "users", "cap", "droplet", "steth", "sprout", "leaf", "link", "phone", "mail", "pin"];
const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const KEY_RE = /^[a-z0-9_-]{1,40}$/;

const str = (v) => (typeof v === "string" ? v : v == null ? "" : String(v));
const len = (v, min, max, msg) => { const n = str(v).length; if (n < min || n > max) fail(400, msg); };
const oneOf = (v, list, msg) => { if (!list.includes(v)) fail(400, msg); };
const isAdmin = (u) => u.role === "admin" || u.role === "super_admin";
const isSuper = (u) => u.role === "super_admin";
const mediaExists = (id) => !id || !!one("media", "SELECT id FROM media WHERE id = ?", id) || fail(400, "The chosen image no longer exists.");

// ---------------------------------------------------------------- security basics
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "strict-origin-when-cross-origin" });
  next();
});

// Changes may only come from this website itself (blocks other sites from acting as a signed-in admin).
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      const o = new URL(origin).host;
      const allowed = [req.headers.host, req.headers["x-forwarded-host"]].filter(Boolean);
      if (!allowed.includes(o)) return res.status(403).json({ error: NOT_ALLOWED });
    } catch { return res.status(403).json({ error: NOT_ALLOWED }); }
  }
  next();
});

app.use("/api", express.json({ limit: "300kb" }));

// Who is signed in (if anyone).
app.use("/api", (req, res, next) => { req.user = userFromToken(readCookie(req, COOKIE)); next(); });
const staff = (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Please sign in again." }));
const admins = (req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ error: NOT_ALLOWED }));
const superOnly = (req, res, next) => (isSuper(req.user) ? next() : res.status(403).json({ error: "Only a super administrator can do this." }));

// ---------------------------------------------------------------- public website
app.get("/api/public/content", (req, res) => {
  const t = now();
  res.json({
    programmes: all("programmes", "SELECT * FROM programmes WHERE status = 'published' ORDER BY sort_order, title"),
    news: all("news_articles", "SELECT * FROM news_articles WHERE status = 'published' AND published_at <= ? ORDER BY published_at DESC LIMIT 12", t),
    blocks: all("page_content", "SELECT page_key, section_key, content FROM page_content WHERE status = 'published'"),
    settings: all("site_settings", "SELECT key, value FROM site_settings WHERE is_public = 1"),
    media: all("media", "SELECT id, storage_path FROM media"),
  });
});

app.post("/api/public/enquiries", (req, res) => {
  const b = req.body || {};
  if (str(b.website).trim()) return res.json({ ok: true }); // hidden field filled in = a bot; store nothing
  const name = str(b.name).trim();
  const email = str(b.email).trim().toLowerCase();
  const interest = str(b.interest).trim() || null;
  const message = str(b.message).trim();
  if (name.length < 2 || name.length > 120) fail(400, "invalid_name");
  if (email.length > 254 || !EMAIL_RE.test(email)) fail(400, "invalid_email");
  if (interest && !INTERESTS.includes(interest)) fail(400, "invalid_interest");
  if (message.length < 5 || message.length > 5000) fail(400, "invalid_message");
  const hourAgo = new Date(Date.now() - 36e5).toISOString();
  const minAgo = new Date(Date.now() - 6e4).toISOString();
  if (db.prepare("SELECT count(*) n FROM enquiries WHERE email = ? AND created_at > ?").get(email, hourAgo).n >= 3
      || db.prepare("SELECT count(*) n FROM enquiries WHERE created_at > ?").get(minAgo).n >= 30) fail(429, "rate_limited");
  const t = now();
  insert("enquiries", { id: uuid(), name, email, interest, message, created_at: t, updated_at: t });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- sign in / out
const attempts = new Map(); // simple brute-force protection: 10 failed tries per 15 minutes
app.post("/api/auth/login", (req, res) => {
  const email = str(req.body?.email).trim().toLowerCase();
  const password = str(req.body?.password);
  const key = req.ip + "|" + email;
  const a = attempts.get(key);
  if (a && a.count >= 10 && Date.now() - a.first < 15 * 6e4) fail(429, "Too many failed attempts. Please wait 15 minutes and try again.");
  const u = one("users", "SELECT * FROM users WHERE email = ?", email);
  if (!u || !verifyPassword(password, u.password_hash)) {
    const cur = a && Date.now() - a.first < 15 * 6e4 ? a : { count: 0, first: Date.now() };
    attempts.set(key, { ...cur, count: cur.count + 1 });
    fail(401, "Incorrect email or password.");
  }
  if (!u.is_active) fail(403, "This account does not have access to the dashboard. Please contact a super administrator.");
  attempts.delete(key);
  const s = createSession(u.id);
  res.cookie(COOKIE, s.token, { httpOnly: true, sameSite: "strict", secure: PROD && req.secure, expires: s.expires, path: "/" });
  res.json({ user: publicUser(u) });
});

app.post("/api/auth/logout", (req, res) => {
  endSession(readCookie(req, COOKIE));
  res.clearCookie(COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", staff, (req, res) => res.json({ user: publicUser(req.user) }));

app.post("/api/auth/password", staff, (req, res) => {
  const { current, next } = req.body || {};
  if (!verifyPassword(str(current), req.user.password_hash)) fail(400, "Your current password is not correct.");
  const p = passwordProblem(next); if (p) fail(400, p);
  update("users", req.user.id, { password_hash: hashPassword(next), updated_at: now() });
  endAllSessions(req.user.id);
  const s = createSession(req.user.id);
  res.cookie(COOKIE, s.token, { httpOnly: true, sameSite: "strict", secure: PROD && req.secure, expires: s.expires, path: "/" });
  res.json({ ok: true });
});

// ---------------------------------------------------------------- everything below needs a signed-in staff member
const A = express.Router();
app.use("/api/admin", staff, A);

// ----- dashboard numbers
A.get("/stats", (req, res) => {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  const r = {
    programmes_published: n("SELECT count(*) n FROM programmes WHERE status = 'published'"),
    programmes_draft: n("SELECT count(*) n FROM programmes WHERE status = 'draft'"),
    news_published: n("SELECT count(*) n FROM news_articles WHERE status = 'published'"),
    news_draft: n("SELECT count(*) n FROM news_articles WHERE status = 'draft'"),
    media_files: n("SELECT count(*) n FROM media"),
  };
  if (isAdmin(req.user)) {
    const d = new Date();
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString();
    Object.assign(r, {
      enquiries_total: n("SELECT count(*) n FROM enquiries"),
      enquiries_new: n("SELECT count(*) n FROM enquiries WHERE status = 'new'"),
      enquiries_in_progress: n("SELECT count(*) n FROM enquiries WHERE status = 'in_progress'"),
      enquiries_this_month: n("SELECT count(*) n FROM enquiries WHERE created_at >= ?", month),
      enquiries_last_month: n("SELECT count(*) n FROM enquiries WHERE created_at >= ? AND created_at < ?", last, month),
    });
  }
  if (isSuper(req.user)) r.admins_active = n("SELECT count(*) n FROM users WHERE is_active = 1");
  res.json(r);
});

// Enquiries per day in Uganda time (UTC+3), zero-filled, oldest first.
A.get("/enquiries-by-day", admins, (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 366);
  const KAMPALA = 3 * 36e5;
  const dayOf = (ms) => new Date(ms + KAMPALA).toISOString().slice(0, 10);
  const today = Date.now();
  const counts = new Map();
  for (let i = days - 1; i >= 0; i--) counts.set(dayOf(today - i * 864e5), 0);
  const from = new Date(today - days * 864e5).toISOString();
  for (const { created_at } of db.prepare("SELECT created_at FROM enquiries WHERE created_at >= ?").all(from)) {
    const k = dayOf(Date.parse(created_at));
    if (counts.has(k)) counts.set(k, counts.get(k) + 1);
  }
  res.json([...counts].map(([day, total]) => ({ day, total })));
});

// ----- enquiries (administrators only)
A.get("/enquiries", admins, (req, res) => {
  const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 12, 1), 100);
  const page = Math.max(Number(req.query.page) || 0, 0);
  const where = [], args = [];
  if (req.query.status && req.query.status !== "all") { where.push("status = ?"); args.push(str(req.query.status)); }
  const q = str(req.query.q).trim().toLowerCase();
  if (q) { where.push("(lower(name) LIKE ? OR lower(email) LIKE ? OR lower(message) LIKE ?)"); const l = `%${q}%`; args.push(l, l, l); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const count = db.prepare(`SELECT count(*) n FROM enquiries ${w}`).get(...args).n;
  const rows = all("enquiries", `SELECT * FROM enquiries ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...args, pageSize, page * pageSize);
  res.json({ rows, count });
});
A.get("/enquiries/new-count", admins, (req, res) => res.json({ count: db.prepare("SELECT count(*) n FROM enquiries WHERE status = 'new'").get().n }));
A.patch("/enquiries/:id", admins, (req, res) => {
  const old = one("enquiries", "SELECT * FROM enquiries WHERE id = ?", req.params.id) || fail(404, "This enquiry no longer exists.");
  const b = req.body || {}, patch = { updated_at: now() };
  if ("status" in b) { oneOf(b.status, ENQ_STATUSES, "Choose a valid status."); patch.status = b.status; }
  if ("assigned_to" in b) {
    if (b.assigned_to && !one("users", "SELECT id FROM users WHERE id = ?", b.assigned_to)) fail(400, "That person no longer exists.");
    patch.assigned_to = b.assigned_to || null;
  }
  if ("internal_notes" in b) { len(b.internal_notes, 0, 5000, "Notes can be at most 5000 characters."); patch.internal_notes = str(b.internal_notes); }
  const st = patch.status || old.status;
  const closed = (s) => s === "resolved" || s === "archived";
  if (closed(st) && !closed(old.status)) patch.handled_at = now();
  else if (!closed(st)) patch.handled_at = null;
  update("enquiries", old.id, patch);
  res.json(one("enquiries", "SELECT * FROM enquiries WHERE id = ?", old.id));
});
A.delete("/enquiries/:id", admins, (req, res) => { run("DELETE FROM enquiries WHERE id = ?", req.params.id); res.json({ ok: true }); });

// ----- shared rule: only administrators may publish, unpublish or archive
function checkPublish(user, oldStatus, newStatus) {
  const changing = oldStatus === undefined ? newStatus !== "draft" : newStatus !== oldStatus;
  if (changing && !isAdmin(user)) fail(403, "Only an administrator can publish, unpublish or archive content.");
}

// ----- programmes
function programmeFields(b) {
  const slug = str(b.slug).trim();
  if (!SLUG_RE.test(slug) || slug.length > 80) fail(400, "The web address may only contain lowercase letters, numbers and dashes.");
  const title = str(b.title).trim(); len(title, 2, 120, "The title must be 2 to 120 characters.");
  const points = Array.isArray(b.points) ? b.points.map((p) => str(p).trim()).filter(Boolean) : [];
  if (points.length < 1 || points.length > 6) fail(400, "Add between 1 and 6 points.");
  if (points.some((p) => p.length > 300)) fail(400, "Each point can be at most 300 characters.");
  const icon = str(b.icon || "star"); oneOf(icon, ICONS, "Choose one of the listed icons.");
  const color = str(b.color || "#D31F2A"); if (!/^#[0-9A-Fa-f]{6}$/.test(color)) fail(400, "Choose a valid colour.");
  mediaExists(b.image_id);
  const status = str(b.status || "draft"); oneOf(status, STATUSES, "Choose a valid status.");
  return { slug, title, points, icon, color, image_id: b.image_id || null, sort_order: Math.trunc(Number(b.sort_order) || 0), status };
}
const getProgramme = (id) => one("programmes", "SELECT * FROM programmes WHERE id = ?", id);
A.get("/programmes", (req, res) => res.json(all("programmes", "SELECT * FROM programmes ORDER BY sort_order, title")));
A.get("/programmes/:id", (req, res) => res.json(getProgramme(req.params.id) || null));
A.post("/programmes", (req, res) => {
  const f = programmeFields(req.body || {});
  checkPublish(req.user, undefined, f.status);
  const t = now(), id = uuid();
  insert("programmes", { ...f, id, published_at: f.status === "published" ? t : null, created_by: req.user.id, updated_by: req.user.id, created_at: t, updated_at: t });
  res.json(getProgramme(id));
});
A.put("/programmes/:id", (req, res) => {
  const old = getProgramme(req.params.id) || fail(404, "This programme no longer exists.");
  const f = programmeFields(req.body || {});
  checkPublish(req.user, old.status, f.status);
  update("programmes", old.id, { ...f, published_at: old.published_at || (f.status === "published" ? now() : null), updated_by: req.user.id, updated_at: now() });
  res.json(getProgramme(old.id));
});
A.patch("/programmes/:id/status", (req, res) => {
  const old = getProgramme(req.params.id) || fail(404, "This programme no longer exists.");
  const status = str(req.body?.status); oneOf(status, STATUSES, "Choose a valid status.");
  checkPublish(req.user, old.status, status);
  update("programmes", old.id, { status, published_at: old.published_at || (status === "published" ? now() : null), updated_by: req.user.id, updated_at: now() });
  res.json(getProgramme(old.id));
});
A.delete("/programmes/:id", admins, (req, res) => { run("DELETE FROM programmes WHERE id = ?", req.params.id); res.json({ ok: true }); });

// ----- news
function newsFields(b) {
  const slug = str(b.slug).trim();
  if (!SLUG_RE.test(slug) || slug.length > 100) fail(400, "The web address may only contain lowercase letters, numbers and dashes.");
  const title = str(b.title).trim(); len(title, 2, 160, "The title must be 2 to 160 characters.");
  const summary = str(b.summary); len(summary, 0, 400, "The summary can be at most 400 characters.");
  const body = str(b.body); len(body, 0, 50000, "The story is too long (maximum 50,000 characters).");
  mediaExists(b.cover_id);
  const status = str(b.status || "draft"); oneOf(status, STATUSES, "Choose a valid status.");
  let published_at = b.published_at ? new Date(b.published_at) : null;
  if (published_at && isNaN(published_at)) fail(400, "Enter a valid publication date.");
  return { slug, title, summary, body, cover_id: b.cover_id || null, status, published_at: published_at ? published_at.toISOString() : null };
}
const getNews = (id) => one("news_articles", "SELECT * FROM news_articles WHERE id = ?", id);
A.get("/news", (req, res) => res.json(all("news_articles", "SELECT * FROM news_articles ORDER BY created_at DESC")));
A.get("/news/:id", (req, res) => res.json(getNews(req.params.id) || null));
A.post("/news", (req, res) => {
  const f = newsFields(req.body || {});
  checkPublish(req.user, undefined, f.status);
  const t = now(), id = uuid();
  insert("news_articles", { ...f, id, published_at: f.published_at || (f.status === "published" ? t : null), author_id: req.user.id, created_by: req.user.id, updated_by: req.user.id, created_at: t, updated_at: t });
  res.json(getNews(id));
});
A.put("/news/:id", (req, res) => {
  const old = getNews(req.params.id) || fail(404, "This story no longer exists.");
  const f = newsFields(req.body || {});
  checkPublish(req.user, old.status, f.status);
  update("news_articles", old.id, { ...f, published_at: f.published_at || (f.status === "published" ? now() : null), updated_by: req.user.id, updated_at: now() });
  res.json(getNews(old.id));
});
A.patch("/news/:id/status", (req, res) => {
  const old = getNews(req.params.id) || fail(404, "This story no longer exists.");
  const status = str(req.body?.status); oneOf(status, STATUSES, "Choose a valid status.");
  checkPublish(req.user, old.status, status);
  update("news_articles", old.id, { status, published_at: old.published_at || (status === "published" ? now() : null), updated_by: req.user.id, updated_at: now() });
  res.json(getNews(old.id));
});
A.delete("/news/:id", admins, (req, res) => { run("DELETE FROM news_articles WHERE id = ?", req.params.id); res.json({ ok: true }); });

// ----- page content blocks
const getBlock = (id) => one("page_content", "SELECT * FROM page_content WHERE id = ?", id);
function blockContent(c) {
  if (!c || typeof c !== "object") fail(400, "The content is not valid.");
  if (JSON.stringify(c).length > 200000) fail(400, "This section is too large to save.");
  return c;
}
A.get("/blocks", (req, res) => res.json(all("page_content", "SELECT * FROM page_content")));
A.post("/blocks", (req, res) => {
  const b = req.body || {};
  const page_key = str(b.page_key), section_key = str(b.section_key);
  if (!KEY_RE.test(page_key) || !KEY_RE.test(section_key)) fail(400, "Unknown page section.");
  const status = str(b.status || "draft"); oneOf(status, STATUSES, "Choose a valid status.");
  const old = one("page_content", "SELECT * FROM page_content WHERE page_key = ? AND section_key = ?", page_key, section_key);
  checkPublish(req.user, old?.status, status);
  const t = now();
  if (old) update("page_content", old.id, { content: blockContent(b.content), status, updated_by: req.user.id, updated_at: t });
  else insert("page_content", { id: uuid(), page_key, section_key, content: blockContent(b.content), status, updated_by: req.user.id, created_at: t, updated_at: t });
  res.json(one("page_content", "SELECT * FROM page_content WHERE page_key = ? AND section_key = ?", page_key, section_key));
});
A.put("/blocks/:id", (req, res) => {
  const old = getBlock(req.params.id) || fail(404, "This section no longer exists.");
  const status = str(req.body?.status || old.status); oneOf(status, STATUSES, "Choose a valid status.");
  checkPublish(req.user, old.status, status);
  update("page_content", old.id, { content: blockContent(req.body?.content), status, updated_by: req.user.id, updated_at: now() });
  res.json(getBlock(old.id));
});
A.delete("/blocks/:id", admins, (req, res) => { run("DELETE FROM page_content WHERE id = ?", req.params.id); res.json({ ok: true }); });

// ----- media library (files are saved in server/data/uploads)
const SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (b) => b.subarray(0, 4).toString("latin1") === "GIF8",
  "image/webp": (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  "application/pdf": (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
};
const getMedia = (id) => one("media", "SELECT * FROM media WHERE id = ?", id);
A.get("/media", (req, res) => res.json(all("media", "SELECT * FROM media ORDER BY created_at DESC")));
A.post("/media", express.raw({ type: () => true, limit: "5mb" }), (req, res) => {
  const mime = str(req.headers["content-type"]).split(";")[0].trim();
  const name = decodeURIComponent(str(req.headers["x-file-name"]) || "file").slice(0, 255) || "file";
  if (!MIME_EXT[mime]) fail(400, `"${name}" is not a supported file type. Use JPG, PNG, WebP, GIF or PDF.`);
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) fail(400, "The file is empty.");
  if (!SIGNATURES[mime](buf)) fail(400, `"${name}" does not look like a real ${MIME_EXT[mime].toUpperCase()} file.`);
  const id = uuid(), storage_path = `${id}.${MIME_EXT[mime]}`;
  writeFileSync(join(UPLOAD_DIR, storage_path), buf);
  try {
    insert("media", { id, storage_path, file_name: name, mime_type: mime, size_bytes: buf.length, uploaded_by: req.user.id, created_at: now() });
  } catch (e) { try { unlinkSync(join(UPLOAD_DIR, storage_path)); } catch {} throw e; }
  res.json(getMedia(id));
});
A.patch("/media/:id", (req, res) => {
  const old = getMedia(req.params.id) || fail(404, "This file no longer exists.");
  len(req.body?.alt_text, 0, 300, "The description can be at most 300 characters.");
  update("media", old.id, { alt_text: str(req.body.alt_text) });
  res.json(getMedia(old.id));
});
A.delete("/media/:id", admins, (req, res) => {
  const m = getMedia(req.params.id);
  if (m) {
    run("DELETE FROM media WHERE id = ?", m.id);
    try { unlinkSync(join(UPLOAD_DIR, m.storage_path)); } catch {}
  }
  res.json({ ok: true });
});

// ----- users & roles
A.get("/users", (req, res) => {
  const rows = isAdmin(req.user) ? all("users", "SELECT * FROM users ORDER BY created_at") : [req.user];
  res.json(rows.map(publicUser));
});
A.post("/users", superOnly, (req, res) => {
  const b = req.body || {};
  const email = str(b.email).trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) fail(400, "Enter a valid email address.");
  const full_name = str(b.full_name).trim(); len(full_name, 2, 120, "Enter the person's name.");
  const role = str(b.role || "editor"); oneOf(role, ROLES, "Choose a valid role.");
  const p = passwordProblem(b.password); if (p) fail(400, p);
  if (one("users", "SELECT id FROM users WHERE email = ?", email)) fail(409, "An account with that email already exists.");
  const t = now(), id = uuid();
  insert("users", { id, email, full_name, role, is_active: true, password_hash: hashPassword(b.password), created_at: t, updated_at: t });
  res.json(publicUser(one("users", "SELECT * FROM users WHERE id = ?", id)));
});
A.patch("/users/:id", (req, res) => {
  const old = one("users", "SELECT * FROM users WHERE id = ?", req.params.id) || fail(404, "This account no longer exists.");
  const b = req.body || {}, patch = {};
  const self = old.id === req.user.id;
  if (!isSuper(req.user) && !self) fail(403, "Only a super administrator can do this.");
  if ("full_name" in b) { const n = str(b.full_name).trim(); len(n, 0, 120, "The name can be at most 120 characters."); patch.full_name = n; }
  if ("role" in b || "is_active" in b || "password" in b) {
    if (!isSuper(req.user)) fail(403, "Only a super administrator can change roles, status or passwords.");
    if ("role" in b) { oneOf(b.role, ROLES, "Choose a valid role."); patch.role = b.role; }
    if ("is_active" in b) patch.is_active = !!b.is_active;
    if ("password" in b) { const p = passwordProblem(b.password); if (p) fail(400, p); patch.password_hash = hashPassword(b.password); }
    const losesSuper = old.role === "super_admin" && old.is_active && ((patch.role && patch.role !== "super_admin") || patch.is_active === false);
    if (losesSuper && db.prepare("SELECT count(*) n FROM users WHERE role = 'super_admin' AND is_active = 1").get().n <= 1) {
      fail(400, "There must always be at least one active super administrator.");
    }
  }
  patch.updated_at = now();
  update("users", old.id, patch);
  if (patch.is_active === false || (patch.password_hash && !self)) endAllSessions(old.id);
  res.json(publicUser(one("users", "SELECT * FROM users WHERE id = ?", old.id)));
});

// ----- site settings
A.get("/settings", (req, res) => res.json(all("site_settings", isAdmin(req.user) ? "SELECT * FROM site_settings" : "SELECT * FROM site_settings WHERE is_public = 1")));
A.put("/settings/:key", admins, (req, res) => {
  const key = req.params.key;
  if (!/^[a-z0-9_]{1,60}$/.test(key)) fail(400, "Unknown setting.");
  const value = req.body?.value;
  if (value === undefined || JSON.stringify(value).length > 20000) fail(400, "The setting is not valid.");
  const t = now();
  if (one("site_settings", "SELECT key FROM site_settings WHERE key = ?", key)) update("site_settings", key, { value, updated_by: req.user.id, updated_at: t }, "key");
  else insert("site_settings", { key, value, is_public: true, updated_by: req.user.id, updated_at: t });
  res.json(one("site_settings", "SELECT * FROM site_settings WHERE key = ?", key));
});

// ---------------------------------------------------------------- errors
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "The file is larger than 5 MB." });
  if (/UNIQUE constraint failed/.test(err.message)) return res.status(409).json({ error: "That value is already in use. Please choose a different one (for example, a different web address)." });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server. Please try again." });
});

// ---------------------------------------------------------------- uploaded files and the built website
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d", immutable: true, index: false }));
if (existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: "1h" }));
  app.get("*", (req, res) => res.sendFile(join(DIST, "index.html")));
}

app.listen(PORT, () => {
  console.log(`PIDA server running at http://localhost:${PORT}`);
  console.log(existsSync(DIST) ? `  Website + dashboard: http://localhost:${PORT}  and  http://localhost:${PORT}/admin` : "  (No built website yet - run \"npm run build\" to serve it from here.)");
  if (!db.prepare("SELECT count(*) n FROM users").get().n) console.log('  No admin accounts yet. Create one with:  npm run create-admin -- you@example.com "YourPassword" "Your Name"');
});
