import { useEffect, useState } from "react";

export const HOLD_MS = 30000; // how long the finished number stays before counting again

// Counts 1 -> the figure over 3 seconds, holds the final number for HOLD_MS, then starts again.
// Returns the current number (v) and the progress from 0 to 1 (p).
export default function useLoopCount(to, go, delay) {
  const [st, setSt] = useState({ v: 1, p: 0 });
  useEffect(() => {
    if (!go) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSt({ v: to, p: 1 });
      return;
    }
    let raf;
    let timer;
    let stopped = false;
    const run = () => {
      let t0;
      const tick = (t) => {
        t0 = t0 || t;
        const k = Math.min((t - t0) / 3000, 1);
        setSt({ v: Math.max(1, Math.round(to * k)), p: k });
        if (k < 1) raf = requestAnimationFrame(tick);
        else timer = setTimeout(() => { if (!stopped) run(); }, HOLD_MS);
      };
      raf = requestAnimationFrame(tick);
    };
    timer = setTimeout(run, delay || 0);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [go, to, delay]);
  return st;
}
