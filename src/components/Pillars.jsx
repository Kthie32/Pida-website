import Icon from "./Icon.jsx";
import { useBlock } from "../content/SiteContent.jsx";

// Four short ideas just under the hero.
export default function Pillars() {
  const { items } = useBlock("home/pillars");
  return (
    <div className="pillars">
      <div className="wrap grid">
        {items.map(({ icon, title, text }) => (
          <div className="card" key={title}>
            <div className="ic" aria-hidden="true">
              <Icon n={icon} />
            </div>
            <h3>{title}</h3>
            <p style={{ margin: 0 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
