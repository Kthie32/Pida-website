import { IMG } from "../data/images.js";

// The picture at the top of each card, with a soft tint of the card colour.
// "src" is the photo chosen in the dashboard; without one, the built-in photos are used in turn.
export default function CardPhoto({ c, k, src }) {
  const photo = src || [IMG.about, IMG.story1, IMG.story2][k % 3];
  const pos = ["50% 28%", "50% 22%", "50% 30%"][k % 3];
  return (
    <div className={"top" + (photo ? " has" : "")} style={{ background: c, "--tc": c }} aria-hidden="true">
      {photo && <img src={photo} alt="" loading="lazy" style={{ objectPosition: pos }} />}
    </div>
  );
}
