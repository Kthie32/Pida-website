import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loadPublicContent, mediaUrl } from "../lib/publicApi.js";
import { PGS, NEWS, BODY } from "../data/content.js";
import { BLOCKS, DEFAULT_SETTINGS, mergeBlock } from "../data/blocks.js";
import { IMG } from "../data/images.js";

// Gives every public section its content: the database version when there is one,
// otherwise the built-in version in src/data. The page therefore never shows an empty gap.

const Ctx = createContext(null);

export function SiteContentProvider({ children }) {
  const [remote, setRemote] = useState(null); // null until loaded (or when not configured)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPublicContent()
      .then((r) => alive && setRemote(r))
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => {
    const media = new Map((remote?.media || []).map((m) => [m.id, mediaUrl(m.storage_path)]));
    const blocks = {};
    (remote?.blocks || []).forEach((b) => { blocks[b.page_key + "/" + b.section_key] = b.content; });
    const settings = {};
    (remote?.settings || []).forEach((s) => { settings[s.key] = s.value; });

    // Programmes: published ones from the database; the built-in six if none are published yet.
    const dbProg = remote?.programmes || [];
    const programmes = dbProg.length
      ? dbProg.map((p) => ({ id: p.id, icon: p.icon, title: p.title, points: p.points, color: p.color, image: media.get(p.image_id) || "" }))
      : PGS.map(([icon, title, points, color], i) => ({ id: "d" + i, icon, title, points, color, image: "" }));

    // News: sample stories ONLY when the server cannot be reached. Otherwise real published stories (maybe none).
    const configured = !ready || remote !== null; // while loading, show "Loading…" rather than sample stories
    let news;
    if (!configured) {
      news = NEWS.map(([title, date, summary, key]) => ({ id: key, title, date, summary, body: BODY, image: IMG[key], art: key, sample: true }));
    } else {
      news = (remote?.news || []).map((n) => ({
        id: n.id, title: n.title, summary: n.summary, image: media.get(n.cover_id) || "", art: null,
        date: n.published_at ? new Date(n.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "",
        body: (n.body || "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean),
      }));
    }

    return { ready, configured, blocks, settings, programmes, news };
  }, [remote, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const useCtx = () => useContext(Ctx);

export function useBlock(key) {
  const { blocks } = useCtx();
  return useMemo(() => mergeBlock(BLOCKS[key].defaults, blocks[key]), [blocks, key]);
}

export function useSettings() {
  const { settings } = useCtx();
  return useMemo(() => ({
    organisation: mergeBlock(DEFAULT_SETTINGS.organisation, settings.organisation),
    contact: mergeBlock(DEFAULT_SETTINGS.contact, settings.contact),
  }), [settings]);
}

export const usePublicProgrammes = () => useCtx().programmes;
export const usePublicNews = () => { const c = useCtx(); return { items: c.news, ready: c.ready, configured: c.configured }; };
