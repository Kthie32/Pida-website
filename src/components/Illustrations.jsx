// Original drawn illustrations. They only appear if a photo cannot be loaded.

function Figure({ x, s, skin, dress, wrap }) {
  return (
    <g transform={`translate(${x} 0) scale(${s})`} style={{ transformOrigin: "0 400px" }}>
      <ellipse cx="0" cy="232" rx="30" ry="14" fill={wrap} />
      <circle cx="0" cy="250" r="24" fill={skin} />
      <path d="M-34 420 Q-30 290 0 290 Q30 290 34 420Z" fill={dress} />
    </g>
  );
}

function Scene({ viewBox, bg, children }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" style={{ width: "100%", height: "auto", display: "block", background: bg }}>
      {children}
    </svg>
  );
}

export const ARTS = {
  about: () => (
    <Scene viewBox="0 0 400 500" bg="#F7F2E8">
      <circle cx="310" cy="110" r="60" fill="#F8BBD0" />
      <path d="M0 380 Q130 320 260 370 T400 350 V500 H0Z" fill="#D31F2A" />
      <rect x="40" y="230" width="18" height="150" fill="#8E1019" />
      <circle cx="49" cy="210" r="62" fill="#A8151F" />
      <circle cx="20" cy="245" r="40" fill="#C0262F" />
      <path d="M0 440 Q150 400 300 435 T400 425 V500 H0Z" fill="#A8151F" />
      <Figure x={110} s={0.85} skin="#5a3520" dress="#F7F2E8" wrap="#A8151F" />
      <Figure x={290} s={0.8} skin="#7a4a2e" dress="#F8BBD0" wrap="#b3472f" />
      <Figure x={150} s={0.55} skin="#7a4a2e" dress="#A8151F" wrap="#F7F2E8" />
      <Figure x={255} s={0.6} skin="#5a3520" dress="#F7F2E8" wrap="#C4161D" />
      <Figure x={200} s={1} skin="#6b4128" dress="#C4161D" wrap="#F8BBD0" />
    </Scene>
  ),
  story1: () => (
    <Scene viewBox="0 0 400 240" bg="#fde8ee">
      <rect x="0" y="215" width="400" height="25" fill="#D31F2A" />
      <rect x="60" y="150" width="140" height="26" rx="4" fill="#A8151F" />
      <rect x="70" y="124" width="120" height="26" rx="4" fill="#F8BBD0" />
      <rect x="80" y="98" width="100" height="26" rx="4" fill="#C4161D" />
      <path d="M230 190 L300 170 L370 190 V215 L300 195 L230 215Z" fill="#fff" stroke="#A8151F" strokeWidth="3" />
    </Scene>
  ),
  story2: () => (
    <Scene viewBox="0 0 400 240" bg="#fbe0e8">
      <circle cx="80" cy="60" r="34" fill="#F8BBD0" />
      <rect x="0" y="200" width="400" height="40" fill="#D31F2A" />
      <rect x="150" y="130" width="100" height="72" fill="#E0457B" />
      <path d="M135 130 L200 85 L265 130Z" fill="#8E1019" />
      <path d="M320 70 Q352 120 320 142 Q288 120 320 70Z" fill="#C2185B" />
    </Scene>
  ),
  story3: () => (
    <Scene viewBox="0 0 400 240" bg="#fdeef1">
      <rect x="0" y="205" width="400" height="35" fill="#E0457B" />
      <path d="M110 150 H290 L270 215 H130Z" fill="#8E1019" />
      <ellipse cx="160" cy="110" rx="14" ry="38" fill="#D31F2A" />
      <ellipse cx="200" cy="95" rx="14" ry="48" fill="#A8151F" />
      <ellipse cx="240" cy="110" rx="14" ry="38" fill="#D31F2A" />
      <circle cx="200" cy="52" r="12" fill="#C4161D" />
    </Scene>
  ),
};
