import { useEffect, useRef, useState } from "react";
import Photo from "./Photo.jsx";
import { ARTS } from "./Illustrations.jsx";
import { useBlock, usePublicNews } from "../content/SiteContent.jsx";

// Story cards. "Read more" opens the full story in a pop-up (Esc, the X, or a click outside closes it).
// Stories are written in the dashboard under News. Without a backend, three sample cards show.
export default function News() {
  const { items, ready, configured } = usePublicNews();
  const { newsHeading, newsText } = useBlock("home/intros");
  const [open, setOpen] = useState(null);
  const closeRef = useRef(null);
  const story = open !== null ? items.find((x) => x.id === open) : null;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const picture = (it, height) =>
    it.image || it.art ? (
      <Photo src={it.image} art={it.art ? ARTS[it.art]() : null} label={"Picture for " + it.title} style={{ minHeight: height, margin: 0, borderRadius: 0 }} />
    ) : (
      <div className="ph" role="img" aria-label="No picture" style={{ minHeight: height, margin: 0, borderRadius: 0 }} />
    );

  return (
    <section id="stories">
      <div className="wrap">
        <div className="center">
          <h2>{newsHeading}</h2>
          <p>{newsText}</p>
        </div>
        {items.length === 0 ? (
          <p className="center" style={{ marginTop: 40, marginInline: "auto" }}>
            {configured && !ready ? "Loading stories…" : "No stories have been published yet. Please check back soon."}
          </p>
        ) : (
          <div className="g3" style={{ marginTop: 40 }}>
            {items.map((it) => (
              <article className="card news" key={it.id}>
                {picture(it, 190)}
                {it.date && <span className="dateb">{it.date}</span>}
                <div className="nb">
                  <h3>{it.title}</h3>
                  <p>{it.summary}</p>
                  <button className="btn btn-green sm" onClick={() => setOpen(it.id)} aria-haspopup="dialog">
                    Read more →
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {story && (
          <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
            <article className="sheet" role="dialog" aria-modal="true" aria-labelledby="mt">
              <button ref={closeRef} className="x" aria-label="Close story" onClick={() => setOpen(null)}>
                ×
              </button>
              {picture(story, 220)}
              <div className="body">
                {story.date && <p className="note">{story.date}</p>}
                <h2 id="mt">{story.title}</h2>
                {story.body.map((x) => (
                  <p key={x}>{x}</p>
                ))}
                <button className="btn btn-green" onClick={() => setOpen(null)}>
                  Close story
                </button>
              </div>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}
