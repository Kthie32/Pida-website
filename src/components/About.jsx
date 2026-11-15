import Icon from "./Icon.jsx";
import { IMG, LOGO } from "../data/images.js";
import { useBlock } from "../content/SiteContent.jsx";

// "Who we are". Wording and photo are edited in the dashboard under Pages & content.
export default function About() {
  const { heading, paragraphs, ticks, image } = useBlock("home/about");
  return (
    <section id="about">
      <div className="wrap split">
        <div className="dup">
          <div className="big">
            <img src={image || IMG.about} alt="Girls and children at a community gathering" />
          </div>
          <div className="small">
            <img src={LOGO} alt="PIDA logo" />
          </div>
          <div className="sticker" aria-hidden="true">
            Since
            <br />
            2014
          </div>
        </div>
        <div>
          <h2>{heading}</h2>
          {paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="feat2">
            <div>
              <Icon n="star" s={20} />
              Women-led
            </div>
            <div>
              <Icon n="home" s={20} />
              Community-rooted
            </div>
          </div>
          <ul className="ticks">
            {ticks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <a className="btn btn-green" href="#contact">
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}
