import { useRef, useState } from "react";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../AuthContext.jsx";
import { deleteMedia, listMedia, publicUrl, updateMedia, uploadMedia } from "../api.js";
import { Empty, ErrorBox, Field, Loading, Modal, PageHeader, useAsync, useConfirm, useLoad, useToast } from "../ui.jsx";
import { explain, fmtDate, fmtSize } from "../utils.js";

function MediaDetail({ item, canDelete, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, run] = useAsync();
  const [alt, setAlt] = useState(item.alt_text);
  const url = publicUrl(item.storage_path);
  const isImg = item.mime_type.startsWith("image/");

  const save = () => run(async () => {
    try { await updateMedia(item.id, { alt_text: alt.trim() }); toast.success("Description saved."); onChanged(); onClose(); }
    catch (e) { toast.error(explain(e)); }
  });
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.success("Link copied."); } catch { toast.error("Could not copy. Select the link and copy it by hand."); } };
  const remove = async () => {
    if (!(await confirm({ title: "Delete this file?", message: "It will be removed permanently. Anywhere it is used on the website will lose it.", confirmLabel: "Delete", danger: true }))) return;
    run(async () => { try { await deleteMedia(item); toast.success("File deleted."); onChanged(); onClose(); } catch (e) { toast.error(explain(e)); } });
  };

  return (
    <Modal title={item.file_name} onClose={onClose} wide>
      <div className="ad-detail">
        <div className="ad-preview">{isImg ? <img src={url} alt={item.alt_text || item.file_name} /> : <Icon n="filetext" s={48} />}</div>
        <div>
          <p className="ad-muted">{item.mime_type} · {fmtSize(item.size_bytes)} · uploaded {fmtDate(item.created_at)}</p>
          <Field label="Description for screen readers (alt text)" id="md-alt" hint="Describe what the picture shows. This helps visitors who cannot see it.">
            <input id="md-alt" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} />
          </Field>
          <Field label="Public link" id="md-url"><input id="md-url" readOnly value={url} onFocus={(e) => e.target.select()} /></Field>
          <div className="ad-actions"><button className="ad-btn" onClick={copy}><Icon n="copy" s={16} /> Copy link</button></div>
        </div>
      </div>
      <div className="ad-actions between">
        <div>{canDelete && <button className="ad-btn danger-o" onClick={remove} disabled={busy}><Icon n="trash" s={16} /> Delete</button>}</div>
        <div className="ad-actions"><button className="ad-btn" onClick={onClose}>Close</button><button className="ad-btn primary" onClick={save} disabled={busy}>Save description</button></div>
      </div>
    </Modal>
  );
}

export default function Media() {
  const { role, user } = useAuth();
  const toast = useToast();
  const { loading, data, error, reload } = useLoad(listMedia);
  const [busy, run] = useAsync();
  const [open, setOpen] = useState(null);
  const input = useRef(null);

  const upload = (files) => run(async () => {
    let ok = 0;
    for (const f of files) {
      try { await uploadMedia(f, user.id); ok++; } catch (e) { toast.error(explain(e)); }
    }
    if (ok) toast.success(ok === 1 ? "File uploaded." : ok + " files uploaded.");
    reload();
  });

  return (
    <>
      <PageHeader title="Media library" subtitle="Photos and documents (JPG, PNG, WebP, GIF or PDF, up to 5 MB each)."
        actions={<><button className="ad-btn primary" onClick={() => input.current.click()} disabled={busy}><Icon n="upload" s={16} /> {busy ? "Uploading…" : "Upload files"}</button>
          <input ref={input} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={(e) => { if (e.target.files.length) upload([...e.target.files]); e.target.value = ""; }} /></>} />
      <div className="ad-card">
        {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : data.length === 0 ? (
          <Empty icon="image" title="No files yet" text="Upload photos taken with the consent of the people in them. Use your own photos rather than other organisations' images."
            action={<button className="ad-btn primary" onClick={() => input.current.click()}>Upload your first file</button>} />
        ) : (
          <div className="ad-media">
            {data.map((m) => (
              <button key={m.id} className="ad-tile" onClick={() => setOpen(m)}>
                {m.mime_type.startsWith("image/") ? <img src={publicUrl(m.storage_path)} alt={m.alt_text || m.file_name} loading="lazy" /> : <span className="ad-doc"><Icon n="filetext" s={34} /></span>}
                <span>{m.file_name}</span><small>{fmtSize(m.size_bytes)}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {open && <MediaDetail item={open} canDelete={role !== "editor"} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}
