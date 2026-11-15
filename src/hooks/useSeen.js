import { useEffect, useRef, useState } from "react";

// Becomes true the first time the element scrolls into view (used to start the counters).
export default function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          o.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return [ref, seen];
}
