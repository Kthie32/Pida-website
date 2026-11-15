import { NAV } from "../data/content.js";
import { LOGO } from "../data/images.js";
import { useSettings } from "../content/SiteContent.jsx";

const WORK = [
  ["Health, SRHR & Protection", "#programmes"],
  ["Education & Skills", "#programmes"],
  ["Livelihoods & Enterprise", "#programmes"],
  ["Water & Environment", "#programmes"],
];

function LinkList({ title, items }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul>
        {items.map(([label, href]) => (
          <li key={label}>
            <a href={href}>{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { contact, organisation } = useSettings();
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <img
              src={LOGO}
              alt="PIDA logo"
              width="84"
              height="84"
              style={{ background: "#fff", borderRadius: "50%", padding: 4, marginBottom: 12, display: "block" }}
            />
            <h3 style={{ fontSize: "1.4rem", color: "#fff" }}>{organisation.short_name}</h3>
            <p>Empowering vulnerable girls and women through education, skills development and stronger household livelihoods.</p>
          </div>
          <LinkList title="Quick links" items={NAV} />
          <LinkList title="Our work" items={WORK} />
          <div>
            <h3>Contact</h3>
            <p>
              {contact.email}
              <br />
              {contact.phone}
              <br />
              {contact.address}
            </p>
          </div>
        </div>
        <p className="small">
          © {new Date().getFullYear()} {organisation.name}. Community action with dignity, accountability and hope.
        </p>
      </div>
    </footer>
  );
}
