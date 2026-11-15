import { useRef, useState } from "react";
import Icon from "../components/Icon.jsx";
import { listMedia, publicUrl, uploadMedia } from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import { Empty, ErrorBox, Loading, Modal, useLoad, useToast } from "./ui.jsx";
import { explain } from "./utils.js";

// Pop-up to choose a picture from the media library (or upload a new one). Calls onPick(mediaRow).
export default function MediaPicker({ onPick, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const { loading, data, error, reload } = useLoad(listMedia);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const images = (data || []).filter((m) => m.mime_type.startsWith("image/"));

  async function upload(files) {
    setBusy(true);
    try {
      let last = null;
      for (const f of files) last = await uploadMedia(f, user.id);
      toast.success("Picture uploaded.");
      await reload();
      if (last && files.length === 1) onPick(last);
    } catch (e) {
      toast.error(explain(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Choose a picture" onClose={onClose} wide>
      <div className="ad-actions">
        <button className="ad-btn primary" onClick={() => input.current.click()} disabled={busy}>
          <Icon n="upload" s={16} /> {busy ? "Uploading…" : "Upload a new picture"}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => { if (e.target.files.length) upload([...e.target.files]); e.target.value = ""; }} />
      </div>
      {loading ? <Loading /> : error ? <ErrorBox error={explain(error)} onRetry={reload} /> : images.length === 0 ? (
        <Empty icon="image" title="No pictures yet" text="Upload your first picture above." />
      ) : (
        <div className="ad-picker">
          {images.map((m) => (
            <button key={m.id} className="ad-pick" onClick={() => onPick(m)} title={m.file_name}>
              <img src={publicUrl(m.storage_path)} alt={m.alt_text || m.file_name} loading="lazy" />
              <span>{m.file_name}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
