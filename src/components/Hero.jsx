import { useEffect, useState } from "react";
import { IMG } from "../data/images.js";
import { useBlock } from "../content/SiteContent.jsx";

const FALLBACK_PHOTOS = [IMG.about, IMG.story1, IMG.story2]; // used when a message has no photo of its own
const ALTS = [
  "Girls and children together at a community gathering",
  "Smiling girls taking a group photo outdoors",
  "Women and graduates celebrating together around a cake",
];

// Rotating messages (the numbered buttons switch them, and the photo changes with them).
// The messages and photos are edited in the dashboard under Pages & content > Hero.
export default function Hero() {
  const { slides } = useBlock("home/hero");
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const current = i < count ? i : 0;

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % count), 7000);
    return () => clearInterval(t);
  }, [paused, count]);

  const { title, text } = slides[current];
  const photos = slides.map((s, n) => s.image || FALLBACK_PHOTOS[n % FALLBACK_PHOTOS.length]);

  return (
    <section
      className="hero"
      id="home"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <svg className="ribbon" viewBox="0 0 1440 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-50 520 C350 560 600 160 1000 260 S1400 60 1500 0" fill="none" stroke="#F48FB1" strokeWidth="70" opacity=".22" strokeLinecap="round" />
        <path d="M-50 580 C380 600 640 240 1020 330 S1420 140 1500 80" fill="none" stroke="#F8BBD0" strokeWidth="10" opacity=".5" strokeLinecap="round" />
      </svg>
      <div className="wrap">
        <div className="copy">
          <h1 key={"t" + current} className="slide">{title}</h1>
          <p key={"p" + current} className="slide">{text}</p>
          <div className="actions">
            <a className="btn btn-pink btn-attn" href="#programmes">Explore our work</a>
            <a className="btn btn-line btn-attn second" href="#involved">Partner with PIDA</a>
          </div>
          {count > 1 && (
            <div className="dots" role="group" aria-label="Choose a message">
              {slides.map((s, n) => (
                <button
                  key={n}
                  className={n === current ? "on" : ""}
                  aria-label={"Show message " + (n + 1)}
                  aria-current={n === current}
                  onClick={() => setI(n)}
                >
                  {n + 1}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="visual">
          <svg className="splash" viewBox="0 0 400 400" aria-hidden="true">
            <path d="M60 150C40 70 150 20 240 40C340 60 390 150 360 250C330 350 220 390 140 350C60 310 80 230 60 150Z" fill="#E0457B" />
          </svg>
          <div className="blob">
            {photos.map((src, n) => (
              <img
                key={n}
                src={src}
                className={n === current ? "on" : ""}
                alt={n === current ? ALTS[n % ALTS.length] : ""}
                aria-hidden={n === current ? undefined : "true"}
              />
            ))}
          </div>
          <div className="badge b1">
            <b>Since 2014</b>
            <span>Women-led, community-based</span>
          </div>
          <div className="badge b2">
            <b>Busia District</b>
            <span>Eastern Uganda</span>
          </div>
        </div>
      </div>
    </section>
  );
}
