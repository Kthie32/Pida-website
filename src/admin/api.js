import { api, mediaUrl } from "../lib/http.js";

// Every call the dashboard makes to the backend lives here. Permissions are enforced by the SERVER
// (server/index.js), so even if someone edits this code in their browser they cannot do more than their role allows.
// (The userId arguments are kept for compatibility; the server always uses the signed-in account.)

export const publicUrl = mediaUrl;
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")).toString();

// ----- session -----
export const login = (email, password) => api("/auth/login", { method: "POST", body: { email, password } });
export const logout = () => api("/auth/logout", { method: "POST" });
export const me = () => api("/auth/me");
export const changeMyPassword = (current, next) => api("/auth/password", { method: "POST", body: { current, next } });

// ----- dashboard -----
export const dashboardStats = () => api("/admin/stats");
export const enquiriesByDay = (days) => api("/admin/enquiries-by-day?" + qs({ days }));

// ----- enquiries -----
export const listEnquiries = ({ status = "all", q = "", page = 0, pageSize = 12 } = {}) =>
  api("/admin/enquiries?" + qs({ status, q: q.trim(), page, pageSize }));
export const updateEnquiry = (id, patch) => api(`/admin/enquiries/${id}`, { method: "PATCH", body: patch });
export const deleteEnquiry = (id) => api(`/admin/enquiries/${id}`, { method: "DELETE" });
export const newEnquiryCount = async () => (await api("/admin/enquiries/new-count")).count;

// ----- programmes -----
export const listProgrammes = () => api("/admin/programmes");
export const getProgramme = (id) => api(`/admin/programmes/${id}`);
export function saveProgramme(row) {
  const payload = { slug: row.slug, title: row.title, points: row.points, icon: row.icon, color: row.color,
    image_id: row.image_id || null, sort_order: row.sort_order, status: row.status };
  return row.id ? api(`/admin/programmes/${row.id}`, { method: "PUT", body: payload }) : api("/admin/programmes", { method: "POST", body: payload });
}
export const deleteProgramme = (id) => api(`/admin/programmes/${id}`, { method: "DELETE" });
export const setProgrammeStatus = (id, status) => api(`/admin/programmes/${id}/status`, { method: "PATCH", body: { status } });

// ----- news -----
export const listNews = () => api("/admin/news");
export const getNews = (id) => api(`/admin/news/${id}`);
export function saveNews(row) {
  const payload = { slug: row.slug, title: row.title, summary: row.summary, body: row.body, cover_id: row.cover_id || null,
    status: row.status, published_at: row.published_at || null };
  return row.id ? api(`/admin/news/${row.id}`, { method: "PUT", body: payload }) : api("/admin/news", { method: "POST", body: payload });
}
export const deleteNews = (id) => api(`/admin/news/${id}`, { method: "DELETE" });
export const setNewsStatus = (id, status) => api(`/admin/news/${id}/status`, { method: "PATCH", body: { status } });

// ----- page content blocks -----
export const listBlocks = () => api("/admin/blocks");
export function saveBlock({ existing, key, content, status }) {
  if (existing) return api(`/admin/blocks/${existing.id}`, { method: "PUT", body: { content, status } });
  const [page_key, section_key] = key.split("/");
  return api("/admin/blocks", { method: "POST", body: { page_key, section_key, content, status } });
}
export const deleteBlock = (id) => api(`/admin/blocks/${id}`, { method: "DELETE" });

// ----- media -----
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
export const MAX_BYTES = 5 * 1024 * 1024;
export const listMedia = () => api("/admin/media");
export function uploadMedia(file) {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error(`"${file.name}" is not a supported file type. Use JPG, PNG, WebP, GIF or PDF.`);
  if (file.size > MAX_BYTES) throw new Error(`"${file.name}" is larger than 5 MB.`);
  return api("/admin/media", { method: "POST", raw: true, body: file,
    headers: { "Content-Type": file.type, "X-File-Name": encodeURIComponent(file.name.slice(0, 255)) } });
}
export const updateMedia = (id, patch) => api(`/admin/media/${id}`, { method: "PATCH", body: patch });
export const deleteMedia = (m) => api(`/admin/media/${m.id}`, { method: "DELETE" });

// ----- team -----
export const listProfiles = () => api("/admin/users");
export const updateProfile = (id, patch) => api(`/admin/users/${id}`, { method: "PATCH", body: patch });
export const addAdmin = ({ email, full_name, role, password }) => api("/admin/users", { method: "POST", body: { email, full_name, role, password } });

// ----- settings -----
export const listSettings = () => api("/admin/settings");
export const saveSetting = (key, value) => api(`/admin/settings/${key}`, { method: "PUT", body: { value } });
