import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import MediaPicker from "../MediaPicker.jsx";
import { useAuth } from "../AuthContext.jsx";
import { deleteNews, getNews, listMedia, listNews, publicUrl, saveNews, setNewsStatus } from "../api.js";
import { Badge, Empty, ErrorBox, Field, Loading, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { explain, fmtDate, slugify, SLUG_RE } from "../utils.js";

const isAdminRole = (r) => r === "admin" || r === "super_admin";
const toLocalInput = (iso) => { if (!iso) return ""; const d = new Date(iso); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function NewsList() {
  const { role, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const { loading, data, error, reload } = useLoad(listNews);
  const canPublish = isAdminRole(role);

  const toggle = (n) => run(async () => {
    const next = n.status === "published" ? "draft" : "published";
    try { await setNewsStatus(n.id, next, user.id); toast.success(next === "published" ? "Published." : "Unpublished."); reload(); }
    catch (e) { toast.error(explain(e)); }
  });
  const remove = async (n) => {
    if (!(await confirm({ title: "Delete story?", message: `"${n.title}" will be removed permanently.`, confirmLabel: "Delete", danger: true }))) return;
    run(async () => { try { await deleteNews(n.id); toast.success("Story deleted."); reload(); } catch (e) { toast.error(explain(e)); } });
  };

  return (
    <>
      <PageHeader title="News" subtitle="Stories and announcements shown in “Latest news and updates”."
        actions={<Link className="ad-btn primary" to="/admin/news/new"><Icon n="plus" s={16} /> New story</Link>} />
      <div className="ad-card">
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : data.length === 0 ? (
          <Empty icon="news" title="No stories yet" text="Write your first story. Only published stories appear on the website."
            action={<Link className="ad-btn primary" to="/admin/news/new">Write a story</Link>} />
        ) : (
          <div className="ad-tablewrap"><table className="ad-table">
            <thead><tr><th>Story</th><th>Status</th><th>Publish date</th><th className="r">Actions</th></tr></thead>
            <tbody>{data.map((n) => (
              <tr key={n.id}>
                <td><b>{n.title}</b><small className="ad-clip">{n.summary}</small></td><td><Badge>{n.status}</Badge></td>
                <td>{n.published_at ? fmtDate(n.published_at, true) : "—"}{n.status === "published" && new Date(n.published_at) > new Date() && <small>Scheduled</small>}</td>
                <td className="r ad-actions end">
                  <Link className="ad-btn sm" to={"/admin/news/" + n.id}><Icon n="pencil" s={14} /> Edit</Link>
                  {canPublish && <button className="ad-btn sm" disabled={busy} onClick={() => toggle(n)}>{n.status === "published" ? "Unpublish" : "Publish"}</button>}
                  {canPublish && <button className="ad-btn sm danger-o" disabled={busy} onClick={() => remove(n)} aria-label={"Delete " + n.title}><Icon n="trash" s={14} /></button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

const EMPTY = { title: "", slug: "", summary: "", body: "", cover_id: null, status: "draft", published_at: "" };

export function NewsForm() {
  const { id } = useParams();
  const isNew = !id;
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, run] = useAsync();
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState(false);
  const media = useLoad(listMedia);
  const existing = useLoad(async () => (isNew ? null : getNews(id)), [id]);
  const canPublish = isAdminRole(role);

  useEffect(() => {
    if (existing.data) { setForm({ ...existing.data, published_at: toLocalInput(existing.data.published_at) }); setSlugTouched(true); }
  }, [existing.data]);

  if (existing.loading) return <Loading />;
  if (existing.error) return <ErrorBox error={explain(existing.error)} onRetry={existing.reload} />;
  if (!isNew && !existing.data) return <Empty icon="alert" title="Story not found" text="It may have been deleted." action={<Link className="ad-btn" to="/admin/news">Back to news</Link>} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const cover = media.data?.find((m) => m.id === form.cover_id);

  function validate() {
    const e = {};
    if (form.title.trim().length < 2 || form.title.trim().length > 160) e.title = "Enter a title between 2 and 160 characters.";
    if (!SLUG_RE.test(form.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    if (form.summary.length > 400) e.summary = "Keep the summary to 400 characters or fewer.";
    if (form.body.trim().length < 10) e.body = "Write the story (at least a sentence).";
    if (form.body.length > 50000) e.body = "The story is too long (maximum 50,000 characters).";
    if (form.published_at && isNaN(new Date(form.published_at))) e.published_at = "Enter a valid date.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const save = (e) => {
    e.preventDefault();
    if (!validate()) { toast.error("Please fix the highlighted fields."); return; }
    run(async () => {
      try {
        await saveNews({ ...form, id: isNew ? undefined : id, title: form.title.trim(), summary: form.summary.trim(), body: form.body.trim(),
          published_at: form.published_at ? new Date(form.published_at).toISOString() : null, status: canPublish ? form.status : (isNew ? "draft" : form.status) }, user.id);
        toast.success(isNew ? "Story created." : "Story saved.");
        navigate("/admin/news");
      } catch (err) { toast.error(explain(err)); }
    });
  };

  return (
    <>
      <PageHeader title={isNew ? "New story" : "Edit story"} subtitle="Leave a blank line between paragraphs."
        actions={<Link className="ad-btn" to="/admin/news">← Back</Link>} />
      <form className="ad-card ad-form" onSubmit={save} noValidate>
        <Field label="Title" id="nw-title" error={errors.title}>
          <input id="nw-title" value={form.title} maxLength={160} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
        </Field>
        <Field label="Web address name (slug)" id="nw-slug" error={errors.slug}>
          <input id="nw-slug" value={form.slug} maxLength={100} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }); }} />
        </Field>
        <Field label="Short summary (shown on the card)" id="nw-sum" error={errors.summary} hint={form.summary.length + " / 400"}>
          <textarea id="nw-sum" rows="3" maxLength={400} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
        </Field>
        <Field label="Full story" id="nw-body" error={errors.body}>
          <textarea id="nw-body" rows="12" value={form.body} onChange={(e) => set({ body: e.target.value })} />
        </Field>
        <Field label="Cover picture (optional)">
          <div className="ad-row">
            {cover && <img className="ad-thumb" src={publicUrl(cover.storage_path)} alt={cover.alt_text || cover.file_name} />}
            <button type="button" className="ad-btn" onClick={() => setPicker(true)}><Icon n="image" s={16} /> {cover ? "Change picture" : "Choose picture"}</button>
            {form.cover_id && <button type="button" className="ad-btn" onClick={() => set({ cover_id: null })}>Remove</button>}
          </div>
        </Field>
        <div className="ad-grid2">
          <Field label="Publish date (optional)" id="nw-date" error={errors.published_at} hint="Leave empty to use the moment it is published. A future date schedules it.">
            <input id="nw-date" type="datetime-local" value={form.published_at} onChange={(e) => set({ published_at: e.target.value })} />
          </Field>
          <Field label="Status" id="nw-status" hint={canPublish ? "Only published stories appear on the website." : "Editors save drafts. An administrator publishes."}>
            <select id="nw-status" value={canPublish ? form.status : (isNew ? "draft" : form.status)} disabled={!canPublish} onChange={(e) => set({ status: e.target.value })}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <div className="ad-actions end">
          <Link className="ad-btn" to="/admin/news">Cancel</Link>
          <button className="ad-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save story"}</button>
        </div>
      </form>
      {picker && <MediaPicker onClose={() => setPicker(false)} onPick={(m) => { set({ cover_id: m.id }); media.reload(); setPicker(false); }} />}
    </>
  );
}
