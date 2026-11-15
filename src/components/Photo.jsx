import { useState } from "react";

// Shows a photo if one is given and it loads; otherwise the drawn illustration (art); otherwise a plain box.
export default function Photo({ src, label, style, art }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    return (
      <img
        src={src}
        alt={label}
        loading="lazy"
        onError={() => setBad(true)}
        style={{ width: "100%", objectFit: "cover", display: "block", ...style, padding: 0, height: (style && style.minHeight) || 180 }}
      />
    );
  }
  if (art) {
    return (
      <div className="ph" role="img" aria-label={label} style={{ ...style, padding: 0, overflow: "hidden", background: "none", display: "block" }}>
        {art}
      </div>
    );
  }
  return (
    <div className="ph" style={style}>
      {label}
    </div>
  );
}
