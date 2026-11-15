// SQLite database for the PIDA website (uses Node's built-in "node:sqlite", no extra install).
// The whole database is ONE file: server/data/pida.db. Back it up by copying that file.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.PIDA_DATA_DIR || join(here, "data");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "pida.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name     TEXT NOT NULL DEFAULT '' CHECK (length(full_name) <= 120),
  role          TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('super_admin','admin','editor')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id           TEXT PRIMARY KEY,
  storage_path TEXT NOT NULL UNIQUE,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/gif','application/pdf')),
  size_bytes   INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
  alt_text     TEXT NOT NULL DEFAULT '' CHECK (length(alt_text) <= 300),
  uploaded_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS page_content (
  id          TEXT PRIMARY KEY,
  page_key    TEXT NOT NULL,
  section_key TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (page_key, section_key)
);

CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  is_public  INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS programmes (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  points       TEXT NOT NULL DEFAULT '[]',
  icon         TEXT NOT NULL DEFAULT 'star',
  color        TEXT NOT NULL DEFAULT '#D31F2A',
  image_id     TEXT REFERENCES media(id) ON DELETE SET NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS news_articles (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  cover_id     TEXT REFERENCES media(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT,
  author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enquiries (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  interest       TEXT,
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','in_progress','resolved','archived')),
  assigned_to    TEXT REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  handled_at     TEXT
);
CREATE INDEX IF NOT EXISTS enquiries_created_idx ON enquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_email_idx ON enquiries (email, created_at DESC);
`);

export const now = () => new Date().toISOString();
export const uuid = () => randomUUID();

// Columns stored as JSON text, turned back into objects/arrays when read.
const JSON_COLS = { page_content: ["content"], site_settings: ["value"], programmes: ["points"] };
const BOOL_COLS = { users: ["is_active"], site_settings: ["is_public"] };

export function decode(table, row) {
  if (!row) return row;
  const out = { ...row };
  for (const c of JSON_COLS[table] || []) out[c] = JSON.parse(out[c]);
  for (const c of BOOL_COLS[table] || []) out[c] = !!out[c];
  return out;
}

export const all = (table, sql, ...args) => db.prepare(sql).all(...args).map((r) => decode(table, r));
export const one = (table, sql, ...args) => decode(table, db.prepare(sql).get(...args));
export const run = (sql, ...args) => db.prepare(sql).run(...args);

// Inserts or updates one row from a plain object (JSON columns are encoded automatically).
function encode(table, obj) {
  const o = { ...obj };
  for (const c of JSON_COLS[table] || []) if (c in o) o[c] = JSON.stringify(o[c]);
  for (const c of BOOL_COLS[table] || []) if (c in o) o[c] = o[c] ? 1 : 0;
  return o;
}
export function insert(table, obj) {
  const o = encode(table, obj);
  const cols = Object.keys(o);
  run(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, ...cols.map((c) => o[c]));
}
export function update(table, id, obj, idCol = "id") {
  const o = encode(table, obj);
  const cols = Object.keys(o);
  if (!cols.length) return;
  run(`UPDATE ${table} SET ${cols.map((c) => c + " = ?").join(", ")} WHERE ${idCol} = ?`, ...cols.map((c) => o[c]), id);
}
