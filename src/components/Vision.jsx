import Icon from "./Icon.jsx";
import { IMG } from "../data/images.js";
import { useBlock } from "../content/SiteContent.jsx";

// Mission, vision and values, beside a blob-framed photo. Edited in the dashboard under Pages & content.
export default function Vision() {
  const { heading, intro, items, image } = useBlock("home/vision");
  return (
    <section>
      <div className="wrap split">
        <div>
          <h2>{heading}</h2>
          {intro && <p>{intro}</p>}
          {items.map((it) => (
            <div className="pt" key={it.title}>
              <div className="ic" aria-hidden="true">
                <Icon n={it.icon || "star"} />
              </div>
              <div>
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="visual">
          <svg className="splash" viewBox="0 0 400 400" aria-hidden="true">
            <path d="M60 150C40 70 150 20 240 40C340 60 390 150 360 250C330 350 220 390 140 350C60 310 80 230 60 150Z" fill="#E0457B" />
          </svg>
          <div className="blob">
            <img src={image || IMG.story2} className="on" alt="Women and graduates celebrating together" style={{ objectPosition: "45% 40%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
