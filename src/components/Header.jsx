import { useState } from "react";
import { NAV } from "../data/content.js";
import { LOGO } from "../data/images.js";
import { useSettings } from "../content/SiteContent.jsx";

function Logo() {
  const [bad, setBad] = useState(false);
  if (bad) {
    return (
      <span className="logo" aria-hidden="true">
        P
      </span>
    );
  }
  return <img className="logo-img" src={LOGO} alt="" width="56" height="56" onError={() => setBad(true)} />;
}

// Top info bar + sticky menu. On phones the Menu button opens and closes the links.
export default function Header() {
  const [open, setOpen] = useState(false);
  const { contact, organisation } = useSettings();
  return (
    <>
      <div className="topbar">
        <div className="wrap">
          <span>Women-led development action in Busia District, Uganda</span>
          <span>{contact.phone} · {contact.email}</span>
        </div>
      </div>
      <header>
        <div className="wrap bar">
          <a href="#home" className="brand" aria-label="PIDA home">
            <Logo />
            <span>
              <b>{organisation.short_name}</b>
              <small>{organisation.name}</small>
            </span>
          </a>
          <button className="burger" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>
            {open ? "Close" : "Menu"}
          </button>
          <nav id="menu" className={open ? "open" : ""} aria-label="Main">
            <ul>
              {NAV.map(([t, href]) => (
                <li key={t}>
                  <a href={href} onClick={() => setOpen(false)}>
                    {t}
                  </a>
                </li>
              ))}
              <li>
                <a href="#involved" className="cta" onClick={() => setOpen(false)}>
                  Donate
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
    </>
  );
}
