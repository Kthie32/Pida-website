import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { ICON_NAMES } from "../../data/blocks.js";
import MediaPicker from "../MediaPicker.jsx";
import { useAuth } from "../AuthContext.jsx";
import { deleteProgramme, getProgramme, listMedia, listProgrammes, publicUrl, saveProgramme, setProgrammeStatus } from "../api.js";
import { Badge, Empty, ErrorBox, Field, Loading, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { explain, fmtDate, HEX_RE, slugify, SLUG_RE } from "../utils.js";

const isAdminRole = (r) => r === "admin" || r === "super_admin";

export function ProgrammeList() {
  const { role, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const { loading, data, error, reload } = useLoad(listProgrammes);
  const canPublish = isAdminRole(role);

  const toggle = (p) => run(async () => {
    const next = p.status === "published" ? "draft" : "published";
    try { await setProgrammeStatus(p.id, next, user.id); toast.success(next === "published" ? "Published. It is now on the website." : "Unpublished. It is hidden from the website."); reload(); }
    catch (e) { toast.error(explain(e)); }
  });
  const remove = async (p) => {
    if (!(await confirm({ title: "Delete programme?", message: `"${p.title}" will be removed permanently.`, confirmLabel: "Delete", danger: true }))) return;
    run(async () => {
      try { await deleteProgramme(p.id); toast.success("Programme deleted."); reload(); }
      catch (e) { toast.error(explain(e)); }
    });
  };

  return (
    <>
      <PageHeader title="Programmes" subtitle="The cards in “Our work” on the website. Only published programmes are shown."
        actions={<Link className="ad-btn primary" to="/admin/programmes/new"><Icon n="plus" s={16} /> New programme</Link>} />
      <div className="ad-card">
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : data.length === 0 ? (
          <Empty icon="layers" title="No programmes yet" text="Create your first programme. Until one is published, the website shows its built-in programmes."
            action={<Link className="ad-btn primary" to="/admin/programmes/new">Create a programme</Link>} />
        ) : (
          <div className="ad-tablewrap"><table className="ad-table">
            <thead><tr><th>Programme</th><th>Status</th><th>Order</th><th>Updated</th><th className="r">Actions</th></tr></thead>
            <tbody>{data.map((p) => (
              <tr key={p.id}>
                <td><span className="ad-swatch" style={{ background: p.color }} /> <b>{p.title}</b><small>{p.points.length} statements</small></td>
                <td><Badge>{p.status}</Badge></td><td>{p.sort_order}</td><td>{fmtDate(p.updated_at)}</td>
                <td className="r ad-actions end">
                  <Link className="ad-btn sm" to={"/admin/programmes/" + p.id}><Icon n="pencil" s={14} /> Edit</Link>
                  {canPublish && <button className="ad-btn sm" disabled={busy} onClick={() => toggle(p)}>{p.status === "published" ? "Unpublish" : "Publish"}</button>}
                  {canPublish && <button className="ad-btn sm danger-o" disabled={busy} onClick={() => remove(p)} aria-label={"Delete " + p.title}><Icon n="trash" s={14} /></button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

const EMPTY = { title: "", slug: "", points: ["", "", ""], icon: "star", color: "#1F4D3A", image_id: null, sort_order: 100, status: "draft" };

export function ProgrammeForm() {
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
  const existing = useLoad(async () => (isNew ? null : getProgramme(id)), [id]);
  const canPublish = isAdminRole(role);

  useEffect(() => {
    if (existing.data) { setForm({ ...existing.data, points: [...existing.data.points] }); setSlugTouched(true); }
  }, [existing.data]);

  if (existing.loading) return <Loading />;
  if (existing.error) return <ErrorBox error={explain(existing.error)} onRetry={existing.reload} />;
  if (!isNew && !existing.data) return <Empty icon="alert" title="Programme not found" text="It may have been deleted." action={<Link className="ad-btn" to="/admin/programmes">Back to programmes</Link>} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const img = media.data?.find((m) => m.id === form.image_id);

  function validate() {
    const e = {};
    if (form.title.trim().length < 2 || form.title.trim().length > 120) e.title = "Enter a title between 2 and 120 characters.";
    if (!SLUG_RE.test(form.slug)) e.slug = "Use lowercase letters, numbers and single hyphens only.";
    const pts = form.points.map((p) => p.trim()).filter(Boolean);
    if (pts.length < 1) e.points = "Add at least one statement.";
    if (pts.some((p) => p.length > 140)) e.points = "Each statement must be 140 characters or fewer.";
    if (!HEX_RE.test(form.color)) e.color = "Enter a colour like #1F4D3A.";
    if (!Number.isInteger(Number(form.sort_order))) e.sort_order = "Enter a whole number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const save = (e) => {
    e.preventDefault();
    if (!validate()) { toast.error("Please fix the highlighted fields."); return; }
    run(async () => {
      try {
        await saveProgramme({ ...form, id: isNew ? undefined : id, title: form.title.trim(), points: form.points.map((p) => p.trim()).filter(Boolean),
          sort_order: Number(form.sort_order), status: canPublish ? form.status : (isNew ? "draft" : form.status) }, user.id);
        toast.success(isNew ? "Programme created." : "Programme saved.");
        navigate("/admin/programmes");
      } catch (err) { toast.error(explain(err)); }
    });
  };

  return (
    <>
      <PageHeader title={isNew ? "New programme" : "Edit programme"} subtitle="Three short statements work best on the card."
        actions={<Link className="ad-btn" to="/admin/programmes">← Back</Link>} />
      <form className="ad-card ad-form" onSubmit={save} noValidate>
        <Field label="Title" id="pg-title" error={errors.title}>
          <input id="pg-title" value={form.title} maxLength={120} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
        </Field>
        <Field label="Web address name (slug)" id="pg-slug" error={errors.slug} hint="Used internally. Generated from the title.">
          <input id="pg-slug" value={form.slug} maxLength={80} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }); }} />
        </Field>
        <Field label="Statements on the card (1 to 6)" error={errors.points}>
          {form.points.map((p, i) => (
            <div className="ad-row" key={i}>
              <input aria-label={"Statement " + (i + 1)} value={p} maxLength={140} onChange={(e) => set({ points: form.points.map((x, j) => (j === i ? e.target.value : x)) })} />
              <button type="button" className="ad-icon-btn" aria-label={"Remove statement " + (i + 1)} disabled={form.points.length <= 1} onClick={() => set({ points: form.points.filter((_, j) => j !== i) })}><Icon n="x" s={16} /></button>
            </div>
          ))}
          {form.points.length < 6 && <button type="button" className="ad-btn sm" onClick={() => set({ points: [...form.points, ""] })}><Icon n="plus" s={14} /> Add statement</button>}
        </Field>
        <div className="ad-grid2">
          <Field label="Icon" id="pg-icon">
            <div className="ad-row">
              <span className="ad-iconprev" style={{ background: form.color }}><Icon n={form.icon} s={22} /></span>
              <select id="pg-icon" value={form.icon} onChange={(e) => set({ icon: e.target.value })}>{ICON_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
            </div>
          </Field>
          <Field label="Card colour" id="pg-color" error={errors.color}>
            <div className="ad-row">
              <input type="color" aria-label="Pick a colour" value={HEX_RE.test(form.color) ? form.color : "#1F4D3A"} onChange={(e) => set({ color: e.target.value.toUpperCase() })} />
              <input id="pg-color" value={form.color} maxLength={7} onChange={(e) => set({ color: e.target.value })} />
            </div>
          </Field>
        </div>
        <Field label="Picture (optional)" hint="Without a picture the website uses its built-in photos.">
          <div className="ad-row">
            {img && <img className="ad-thumb" src={publicUrl(img.storage_path)} alt={img.alt_text || img.file_name} />}
            <button type="button" className="ad-btn" onClick={() => setPicker(true)}><Icon n="image" s={16} /> {img ? "Change picture" : "Choose picture"}</button>
            {form.image_id && <button type="button" className="ad-btn" onClick={() => set({ image_id: null })}>Remove</button>}
          </div>
        </Field>
        <div className="ad-grid2">
          <Field label="Order on the page" id="pg-order" error={errors.sort_order} hint="Smaller numbers appear first.">
            <input id="pg-order" type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} />
          </Field>
          <Field label="Status" id="pg-status" hint={canPublish ? "Only published programmes appear on the website." : "Editors save drafts. An administrator publishes."}>
            <select id="pg-status" value={canPublish ? form.status : (isNew ? "draft" : form.status)} disabled={!canPublish} onChange={(e) => set({ status: e.target.value })}>
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </Field>
        </div>
        <div className="ad-actions end">
          <Link className="ad-btn" to="/admin/programmes">Cancel</Link>
          <button className="ad-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save programme"}</button>
        </div>
      </form>
      {picker && <MediaPicker onClose={() => setPicker(false)} onPick={(m) => { set({ image_id: m.id }); media.reload(); setPicker(false); }} />}
    </>
  );
}
