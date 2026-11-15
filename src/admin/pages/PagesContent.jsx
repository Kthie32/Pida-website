import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { BLOCKS, mergeBlock } from "../../data/blocks.js";
import MediaPicker from "../MediaPicker.jsx";
import { useAuth } from "../AuthContext.jsx";
import { deleteBlock, listBlocks, publicUrl, saveBlock } from "../api.js";
import { Badge, Empty, ErrorBox, Field, Loading, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { explain } from "../utils.js";

const isAdminRole = (r) => r === "admin" || r === "super_admin";

// ---------- list of editable blocks ----------
export function PagesList() {
  const { loading, data, error, reload } = useLoad(listBlocks);
  return (
    <>
      <PageHeader title="Pages & content" subtitle="Edit the wording and photos of the home page. Until you save a section, the website shows its built-in wording." />
      <div className="ad-card">
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : (
          <div className="ad-tablewrap"><table className="ad-table">
            <thead><tr><th>Section</th><th>Version on the website</th><th className="r">Actions</th></tr></thead>
            <tbody>{Object.entries(BLOCKS).map(([key, b]) => {
              const row = data.find((r) => r.page_key + "/" + r.section_key === key);
              return (
                <tr key={key}>
                  <td><b>{b.label}</b><small>{b.help}</small></td>
                  <td>{!row ? <Badge tone="grey">Built-in wording</Badge> : <Badge>{row.status}</Badge>}</td>
                  <td className="r ad-actions end"><Link className="ad-btn sm" to={"/admin/pages/" + key}><Icon n="pencil" s={14} /> Edit</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}

// ---------- generic form built from a block's schema ----------
const clone = (v) => JSON.parse(JSON.stringify(v));
const emptyItem = (fields) => Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? 1 : f.type === "lines" ? [""] : f.type === "select" ? f.options[0] : ""]));

function validate(schema, value, path = "", out = {}) {
  for (const f of schema) {
    const p = path + f.key;
    const v = value?.[f.key];
    if (f.type === "list") {
      const arr = Array.isArray(v) ? v : [];
      if (arr.length < (f.min || 0)) out[p] = `Add at least ${f.min}.`;
      if (arr.length > (f.max || 99)) out[p] = `No more than ${f.max} allowed.`;
      arr.forEach((it, i) => validate(f.fields, it, `${p}.${i}.`, out));
    } else if (f.type === "lines") {
      const lines = (v || []).map((x) => x.trim()).filter(Boolean);
      if (f.required && lines.length === 0) out[p] = "This is required.";
      if (lines.some((x) => x.length > (f.max || 500))) out[p] = `Each line must be ${f.max} characters or fewer.`;
    } else if (f.type === "number") {
      const n = Number(v);
      if (v === "" || v === null || Number.isNaN(n) || !Number.isFinite(n)) out[p] = "Enter a number.";
      else if (n < (f.min ?? -Infinity) || n > (f.max ?? Infinity)) out[p] = `Enter a number from ${f.min} to ${f.max}.`;
    } else if (f.type !== "image" && f.type !== "select") {
      const s = String(v ?? "").trim();
      if (f.required && !s) out[p] = "This is required.";
      else if (s.length > (f.max || 1000)) out[p] = `Keep this to ${f.max} characters or fewer.`;
    }
  }
  return out;
}

function clean(schema, value) {
  const out = {};
  for (const f of schema) {
    const v = value?.[f.key];
    if (f.type === "list") out[f.key] = (v || []).map((it) => clean(f.fields, it));
    else if (f.type === "lines") out[f.key] = (v || []).map((x) => x.trim()).filter(Boolean);
    else if (f.type === "number") out[f.key] = Number(v);
    else out[f.key] = String(v ?? "").trim();
  }
  return out;
}

function SchemaFields({ schema, value, onChange, errors, path = "", pickImage }) {
  return schema.map((f) => {
    const p = path + f.key;
    const v = value[f.key];
    const set = (nv) => onChange({ ...value, [f.key]: nv });
    const id = "bf-" + p.replace(/\./g, "-");
    if (f.type === "list") {
      const arr = v || [];
      const move = (i, d) => { const a = [...arr]; [a[i], a[i + d]] = [a[i + d], a[i]]; set(a); };
      return (
        <fieldset className="ad-list" key={p}>
          <legend>{f.label}</legend>
          {errors[p] && <small className="ad-err" role="alert">{errors[p]}</small>}
          {arr.map((it, i) => (
            <div className="ad-item" key={i}>
              <div className="ad-item-head">
                <b>{f.itemLabel} {i + 1}</b>
                <span className="ad-actions">
                  <button type="button" className="ad-icon-btn" disabled={i === 0} aria-label="Move up" onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="ad-icon-btn" disabled={i === arr.length - 1} aria-label="Move down" onClick={() => move(i, 1)}>↓</button>
                  <button type="button" className="ad-icon-btn" disabled={arr.length <= (f.min || 0)} aria-label={"Remove " + f.itemLabel + " " + (i + 1)} onClick={() => set(arr.filter((_, j) => j !== i))}><Icon n="trash" s={15} /></button>
                </span>
              </div>
              <SchemaFields schema={f.fields} value={it} errors={errors} path={`${p}.${i}.`} pickImage={pickImage}
                onChange={(nv) => set(arr.map((x, j) => (j === i ? nv : x)))} />
            </div>
          ))}
          {arr.length < (f.max || 99) && <button type="button" className="ad-btn sm" onClick={() => set([...arr, emptyItem(f.fields)])}><Icon n="plus" s={14} /> Add {f.itemLabel.toLowerCase()}</button>}
        </fieldset>
      );
    }
    if (f.type === "image") {
      return (
        <Field key={p} label={f.label} error={errors[p]}>
          <div className="ad-row">
            {v && <img className="ad-thumb" src={v} alt="" />}
            <button type="button" className="ad-btn" onClick={() => pickImage((url) => set(url))}><Icon n="image" s={16} /> {v ? "Change photo" : "Choose photo"}</button>
            {v && <button type="button" className="ad-btn" onClick={() => set("")}>Use built-in photo</button>}
          </div>
        </Field>
      );
    }
    return (
      <Field key={p} label={f.label} id={id} error={errors[p]}>
        {f.type === "textarea" ? <textarea id={id} rows="3" value={v ?? ""} maxLength={f.max} onChange={(e) => set(e.target.value)} />
          : f.type === "lines" ? <textarea id={id} rows={Math.max(3, (v || []).length + 1)} value={(v || []).join("\n")} onChange={(e) => set(e.target.value.split("\n"))} />
          : f.type === "select" ? <select id={id} value={v} onChange={(e) => set(e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
          : f.type === "number" ? <input id={id} type="number" value={v ?? ""} onChange={(e) => set(e.target.value)} />
          : <input id={id} value={v ?? ""} maxLength={f.max} onChange={(e) => set(e.target.value)} />}
      </Field>
    );
  });
}

// ---------- editor for one block ----------
export function BlockEditor() {
  const { page, section } = useParams();
  const key = page + "/" + section;
  const def = BLOCKS[key];
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const [value, setValue] = useState(null);
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState(null);
  const { loading, data, error, reload } = useLoad(listBlocks, [key]);
  const canPublish = isAdminRole(role);
  const existing = data?.find((r) => r.page_key + "/" + r.section_key === key);

  useEffect(() => {
    if (data && def) setValue(clone(mergeBlock(def.defaults, existing?.content)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key]);

  if (!def) return <Empty icon="alert" title="Section not found" action={<Link className="ad-btn" to="/admin/pages">Back</Link>} />;
  if (loading || !value) return error ? <ErrorBox error={explain(error)} onRetry={reload} /> : <Loading />;

  const save = (status) => {
    const errs = validate(def.schema, value);
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields."); return; }
    run(async () => {
      try {
        await saveBlock({ existing, key, content: clean(def.schema, value), status }, user.id);
        toast.success(status === "published" ? "Saved and published. The website now shows this version." : "Saved as a draft. The website is unchanged.");
        navigate("/admin/pages");
      } catch (e) { toast.error(explain(e)); }
    });
  };
  const reset = async () => {
    if (!(await confirm({ title: "Go back to the built-in wording?", message: "Your saved version of this section will be deleted and the website will show the original wording again.", confirmLabel: "Reset", danger: true }))) return;
    run(async () => { try { await deleteBlock(existing.id); toast.success("Reset to the built-in wording."); navigate("/admin/pages"); } catch (e) { toast.error(explain(e)); } });
  };

  // An editor may edit but not change publication: keep the current status (or draft for a new section).
  const keepStatus = existing ? existing.status : "draft";

  return (
    <>
      <PageHeader title={def.label} subtitle={def.help} actions={<Link className="ad-btn" to="/admin/pages">← Back</Link>} />
      {existing && <p className="ad-note">Current version on the website: <Badge>{existing.status}</Badge></p>}
      <form className="ad-card ad-form" onSubmit={(e) => e.preventDefault()} noValidate>
        <SchemaFields schema={def.schema} value={value} onChange={setValue} errors={errors} pickImage={(cb) => setPicker({ cb })} />
        <div className="ad-actions between">
          <div>{existing && canPublish && <button type="button" className="ad-btn danger-o" onClick={reset} disabled={busy}>Reset to built-in wording</button>}</div>
          <div className="ad-actions">
            {canPublish ? (
              <>
                <button type="button" className="ad-btn" onClick={() => save("draft")} disabled={busy}>Save as draft</button>
                <button type="button" className="ad-btn primary" onClick={() => save("published")} disabled={busy}>{busy ? "Saving…" : "Save and publish"}</button>
              </>
            ) : (
              <button type="button" className="ad-btn primary" onClick={() => save(keepStatus)} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
            )}
          </div>
        </div>
        {!canPublish && <p className="ad-muted">Editors can save changes; an administrator publishes new sections.</p>}
      </form>
      {picker && <MediaPicker onClose={() => setPicker(null)} onPick={(m) => { picker.cb(publicUrl(m.storage_path)); setPicker(null); }} />}
    </>
  );
}
