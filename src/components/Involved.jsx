import Icon from "./Icon.jsx";
import CardPhoto from "./CardPhoto.jsx";
import { useBlock } from "../content/SiteContent.jsx";

const COLORS = ["#111111", "#D31F2A", "#E0457B"];

// Volunteer / Partner / Donate cards, then the call-to-action band. Edited under Pages & content.
export default function Involved() {
  const { heading, intro, cards, ctaTitle, ctaText } = useBlock("home/involved");
  return (
    <section id="involved">
      <div className="wrap">
        <div className="center">
          <h2>{heading}</h2>
          <p>{intro}</p>
        </div>
        <div className="g3" style={{ margin: "40px 0 56px" }}>
          {cards.map((c, k) => (
            <div className="card pg" key={c.title}>
              <CardPhoto c={COLORS[k % COLORS.length]} k={k} />
              <div className="cut">
                <div className="badge2" aria-hidden="true">
                  <Icon n={c.icon || "star"} s={26} />
                </div>
                <h3>{c.title}</h3>
                <ul className="ticks">
                  {c.points.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a className="btn btn-green" href="#contact">
                  {c.button}
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="cta-band">
          <h2>{ctaTitle}</h2>
          <p>{ctaText}</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <a className="btn btn-gold" href="#contact">Get in touch</a>
            <a className="btn btn-line" href="#programmes">See our work</a>
          </div>
        </div>
      </div>
    </section>
  );
}
