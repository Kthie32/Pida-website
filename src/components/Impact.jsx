import Icon from "./Icon.jsx";
import useSeen from "../hooks/useSeen.js";
import useLoopCount from "../hooks/useLoopCount.js";
import { useBlock } from "../content/SiteContent.jsx";

// One round badge. The ring draws itself as the number counts up; when it finishes, a soft glow blooms.
function Stat({ icon, n, suffix, label, k }) {
  const [ref, seen] = useSeen();
  const { v, p } = useLoopCount(n, seen, k * 450);
  const R = 46;
  const C = 2 * Math.PI * R;
  const ang = p * 2 * Math.PI - Math.PI / 2;
  const done = seen && p >= 1;
  return (
    <div
      ref={ref}
      className={"stat" + (seen ? " seen" : "") + (done ? " done" : "")}
      role="group"
      aria-label={n + suffix + " " + label}
    >
      <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={"rg" + k} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E81E26" />
            <stop offset="1" stopColor="#F06292" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#F8BBD0" strokeWidth="3" opacity=".55" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={"url(#rg" + k + ")"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - p)}
          transform="rotate(-90 50 50)"
        />
        <g className="orbit">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeDasharray={"22 " + (C - 22)} opacity=".9" transform="rotate(-90 50 50)" />
        </g>
        <g className="orbit o2">
          <circle cx={50 + R} cy="50" r="2.6" fill="#F06292" />
        </g>
        <g className="orbit o3">
          <circle cx={50 - R} cy="50" r="2.1" fill="#E81E26" />
        </g>
        {seen && p > 0 && p < 1 && (
          <circle cx={50 + R * Math.cos(ang)} cy={50 + R * Math.sin(ang)} r="3.6" fill="#fff" stroke="#E81E26" strokeWidth="2" />
        )}
      </svg>
      <div className="ic" aria-hidden="true">
        <Icon n={icon} />
      </div>
      <b aria-hidden="true">{v + suffix}</b>
      <span aria-hidden="true">{label}</span>
    </div>
  );
}

// Reported figures only (from PIDA's organisational profile). Numbers count up when scrolled into view.
export default function Impact() {
  const { heading, note, stats } = useBlock("home/impact");
  return (
    <section id="impact" style={{ paddingTop: 20 }}>
      <div className="wrap center">
        <h2>{heading}</h2>
        {note && <p>{note}</p>}
        <div className="stat-grid">
          {stats.map((s, k) => (
            <Stat key={s.label + k} icon={s.icon} n={Number(s.value) || 1} suffix={s.suffix || ""} label={s.label} k={k} />
          ))}
        </div>
      </div>
    </section>
  );
}
