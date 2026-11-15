import Icon from "./Icon.jsx";
import CardPhoto from "./CardPhoto.jsx";
import { useBlock, usePublicProgrammes } from "../content/SiteContent.jsx";

// "Our work": one card per published programme (managed in the dashboard under Programmes).
export default function Programmes() {
  const programmes = usePublicProgrammes();
  const { programmesHeading, programmesText } = useBlock("home/intros");
  return (
    <section id="programmes">
      <div className="wrap">
        <div className="center">
          <h2>{programmesHeading}</h2>
          <p>{programmesText}</p>
        </div>
        <div className="g3" style={{ marginTop: 40 }}>
          {programmes.map((p, k) => (
            <article className="card pg" key={p.id}>
              <CardPhoto c={p.color} k={k} src={p.image} />
              <div className="cut">
                <div className="badge2" aria-hidden="true">
                  <Icon n={p.icon} s={26} />
                </div>
                <h3>{p.title}</h3>
                <ul className="ticks">
                  {p.points.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <a className="more" href="#contact">
                  Ask about this area →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
