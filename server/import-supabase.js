// One-time copy of the PUBLISHED content (programmes, news, page sections, settings, media files)
// from the old Supabase project into the local SQLite database. Reads .env.local for the old address.
// Safe to run again: rows that already exist (same id) are skipped.
// Usage:  npm run import-supabase
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { one, insert, UPLOAD_DIR, now } from "./db.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => /^\s*VITE_SUPABASE_/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) { console.error("No Supabase address/key found in .env.local - nothing to import."); process.exit(1); }

const get = async (path) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
};
const added = { media: 0, programmes: 0, news_articles: 0, page_content: 0, site_settings: 0 };
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };

// Media first (programmes and news point at it). Files are downloaded into server/data/uploads.
for (const m of await get("media?select=*")) {
  if (one("media", "SELECT id FROM media WHERE id = ?", m.id)) continue;
  const r = await fetch(`${url}/storage/v1/object/public/media/${m.storage_path}`);
  if (!r.ok) { console.warn(`  skipped file ${m.file_name} (${r.status})`); continue; }
  const path = `${m.id}.${EXT[m.mime_type] || "bin"}`;
  writeFileSync(join(UPLOAD_DIR, path), Buffer.from(await r.arrayBuffer()));
  insert("media", { id: m.id, storage_path: path, file_name: m.file_name, mime_type: m.mime_type, size_bytes: m.size_bytes, alt_text: m.alt_text || "", created_at: m.created_at });
  added.media++;
}
const mediaOk = (id) => (id && one("media", "SELECT id FROM media WHERE id = ?", id) ? id : null);

for (const p of await get("programmes?select=*&status=eq.published")) {
  if (one("programmes", "SELECT id FROM programmes WHERE id = ? OR slug = ?", p.id, p.slug)) continue;
  insert("programmes", { id: p.id, slug: p.slug, title: p.title, points: p.points, icon: p.icon, color: p.color, image_id: mediaOk(p.image_id),
    sort_order: p.sort_order, status: p.status, published_at: p.published_at, created_at: p.created_at, updated_at: p.updated_at });
  added.programmes++;
}
for (const n of await get("news_articles?select=*&status=eq.published")) {
  if (one("news_articles", "SELECT id FROM news_articles WHERE id = ? OR slug = ?", n.id, n.slug)) continue;
  insert("news_articles", { id: n.id, slug: n.slug, title: n.title, summary: n.summary, body: n.body, cover_id: mediaOk(n.cover_id),
    status: n.status, published_at: n.published_at, created_at: n.created_at, updated_at: n.updated_at });
  added.news_articles++;
}
for (const b of await get("page_content?select=*&status=eq.published")) {
  if (one("page_content", "SELECT id FROM page_content WHERE page_key = ? AND section_key = ?", b.page_key, b.section_key)) continue;
  insert("page_content", { id: b.id, page_key: b.page_key, section_key: b.section_key, content: b.content, status: b.status, created_at: b.created_at, updated_at: b.updated_at });
  added.page_content++;
}
for (const s of await get("site_settings?select=*")) {
  if (one("site_settings", "SELECT key FROM site_settings WHERE key = ?", s.key)) continue;
  insert("site_settings", { key: s.key, value: s.value, is_public: s.is_public ?? true, updated_at: s.updated_at || now() });
  added.site_settings++;
}
console.log("Imported:", added);
console.log("Note: drafts, enquiries and admin accounts are private in Supabase and could not be copied with the public key.");
