import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon.jsx";
import { useAuth } from "../AuthContext.jsx";
import { dashboardStats, enquiriesByDay, listBlocks, listEnquiries, listSettings } from "../api.js";
import { Badge, Empty, ErrorBox, Loading, useLoad } from "../ui.jsx";
import { explain, fmtDate, greeting } from "../utils.js";

const RANGES = [["12 months", 365], ["3 months", 90], ["30 days", 30], ["7 days", 7]];
const STATUS_LABEL = { new: "New", read: "Read", in_progress: "In progress", resolved: "Resolved", archived: "Archived" };

// Sum days into weeks when the range is long, so the chart stays readable.
function bucket(points, days) {
  if (days <= 90) return points.map((p) => ({ label: p.day, total: Number(p.total) }));
  const out = [];
  for (let i = 0; i < points.length; i += 7) {
    const chunk = points.slice(i, i + 7);
    out.push({ label: chunk[0].day, total: chunk.reduce((a, c) => a + Number(c.total), 0) });
  }
  return out;
}

function Chart({ points, empty }) {
  const W = 760, H = 230, L = 34, B = 26, T = 10, R = 8;
  const max = Math.max(4, ...points.map((p) => p.total));
  const top = Math.ceil(max / 2) * 2;
  const x = (i) => L + (points.length < 2 ? 0 : (i * (W - L - R)) / (points.length - 1));
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.total).toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${x(points.length - 1).toFixed(1)} ${H - B} L${x(0).toFixed(1)} ${H - B} Z` : "";
  const ticks = [0, top / 2, top];
  const labelAt = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return (
    <div className="ad-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Enquiries received over time">
        <defs>
          <linearGradient id="adfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f4d3a" stopOpacity=".28" /><stop offset="1" stopColor="#1f4d3a" stopOpacity="0" /></linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" /><text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{t}</text></g>
        ))}
        {points.length > 0 && <><path d={area} fill="url(#adfill)" /><path d={line} fill="none" stroke="#1f4d3a" strokeWidth="2.2" strokeLinejoin="round" /></>}
        {points.length > 0 && labelAt.map((i, k) => (
          <text key={k} x={x(i)} y={H - 6} fontSize="11" fill="#6b7280" textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}>
            {new Date(points[i].label).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </text>
        ))}
      </svg>
      {empty && <p className="ad-chart-empty">No enquiries in this period.</p>}
    </div>
  );
}

export default function Dashboard() {
  const { profile, role } = useAuth();
  const isAdmin = role !== "editor";
  const [range, setRange] = useState(30);
  const { loading, data, error, reload } = useLoad(async () => {
    const [stats, blocks, settings, latest, series] = await Promise.all([
      dashboardStats(),
      listBlocks(),
      isAdmin ? listSettings() : null,
      isAdmin ? listEnquiries({ page: 0, pageSize: 5 }) : null,
      isAdmin ? enquiriesByDay(365) : null,
    ]);
    return { stats, blocks, settings, latest, series };
  }, [isAdmin]);

  const points = useMemo(() => (data?.series ? bucket(data.series.slice(-range), range) : []), [data, range]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorBox error={explain(error)} onRetry={reload} />;
  const { stats: s, blocks, settings, latest } = data;
  const first = (profile.full_name || "").split(" ")[0] || "there";
  const diff = isAdmin ? s.enquiries_this_month - s.enquiries_last_month : 0;

  const cards = isAdmin
    ? [
        { label: "Enquiries this month", value: s.enquiries_this_month, note: `${diff >= 0 ? "+" : ""}${diff} compared with last month`, icon: "trend" },
        { label: "New enquiries", value: s.enquiries_new, note: s.enquiries_new ? "Waiting for a first reply" : "All caught up", icon: "inbox", to: "/admin/enquiries" },
        { label: "Published programmes", value: s.programmes_published, note: `${s.programmes_draft} in draft`, icon: "layers", to: "/admin/programmes" },
        { label: "Published stories", value: s.news_published, note: `${s.news_draft} in draft`, icon: "news", to: "/admin/news" },
      ]
    : [
        { label: "Published programmes", value: s.programmes_published, note: "Visible on the website", icon: "layers", to: "/admin/programmes" },
        { label: "Programme drafts", value: s.programmes_draft, note: "Waiting for an administrator to publish", icon: "pencil", to: "/admin/programmes" },
        { label: "Published stories", value: s.news_published, note: `${s.news_draft} in draft`, icon: "news", to: "/admin/news" },
        { label: "Files in media library", value: s.media_files, note: "Pictures and documents", icon: "image", to: "/admin/media" },
      ];

  const checklist = [
    isAdmin && { label: "Save the contact details", done: !!settings?.some((x) => x.key === "contact"), to: "/admin/settings" },
    { label: "Publish at least one programme", done: s.programmes_published > 0, to: "/admin/programmes" },
    { label: "Publish at least one story", done: s.news_published > 0, to: "/admin/news" },
    { label: "Upload your own photos", done: s.media_files > 0, to: "/admin/media" },
    { label: "Edit the home page wording", done: blocks.some((b) => b.status === "published"), to: "/admin/pages" },
  ].filter(Boolean);
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <>
      <div className="ad-pagehead">
        <div>
          <h1>{greeting()}, {first}</h1>
          <p>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · here is how the website is doing</p>
        </div>
        <div className="ad-actions">
          <a className="ad-btn" href="/" target="_blank" rel="noreferrer"><Icon n="external" s={16} /> View site</a>
          <Link className="ad-btn primary" to="/admin/pages"><Icon n="pencil" s={16} /> Edit pages</Link>
        </div>
      </div>

      <div className="ad-stats">
        {cards.map((c) => {
          const body = (<><div className="ad-stat-top"><span className="ad-stat-ic"><Icon n={c.icon} s={18} /></span><span>{c.label}</span></div><strong>{c.value}</strong><small>{c.note}</small></>);
          return c.to ? <Link key={c.label} to={c.to} className="ad-card ad-stat">{body}</Link> : <div key={c.label} className="ad-card ad-stat">{body}</div>;
        })}
      </div>

      {isAdmin && (
        <div className="ad-card">
          <div className="ad-card-head">
            <div><h2>Enquiries</h2><p className="ad-muted">{points.reduce((a, p) => a + p.total, 0)} received in the selected period</p></div>
            <div className="ad-tabs" role="tablist">
              {RANGES.map(([l, d]) => <button key={d} role="tab" aria-selected={range === d} className={range === d ? "on" : ""} onClick={() => setRange(d)}>{l}</button>)}
            </div>
          </div>
          <Chart points={points} empty={points.every((p) => p.total === 0)} />
        </div>
      )}

      <div className="ad-two">
        {isAdmin && (
          <div className="ad-card">
            <div className="ad-card-head"><h2>Latest enquiries</h2><Link className="ad-btn" to="/admin/enquiries">Open all →</Link></div>
            {latest.rows.length === 0 ? <Empty icon="inbox" title="No enquiries yet" text="Messages sent through the contact form will appear here." /> : (
              <div className="ad-tablewrap"><table className="ad-table">
                <thead><tr><th>From</th><th>Topic</th><th>Status</th><th>Received</th></tr></thead>
                <tbody>{latest.rows.map((e) => (
                  <tr key={e.id}><td><b>{e.name}</b><small>{e.email}</small></td><td>{e.interest || "—"}</td><td><Badge>{STATUS_LABEL[e.status]}</Badge></td><td>{fmtDate(e.created_at, true)}</td></tr>
                ))}</tbody>
              </table></div>
            )}
          </div>
        )}
        <div className="ad-card">
          <div className="ad-card-head"><h2>Finish setting up</h2><span className="ad-muted">{doneCount} of {checklist.length} done</span></div>
          <div className="ad-progress" aria-hidden="true"><i style={{ width: (doneCount / checklist.length) * 100 + "%" }} /></div>
          <ul className="ad-checklist">
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? "done" : ""}>
                <span className="ad-tick">{c.done && <Icon n="check" s={14} />}</span>
                {c.done ? <span>{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
