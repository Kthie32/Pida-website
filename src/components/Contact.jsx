import { useState } from "react";
import Icon from "./Icon.jsx";
import { useBlock, useSettings } from "../content/SiteContent.jsx";
import { submitEnquiry } from "../lib/publicApi.js";

function Row({ icon, title, children }) {
  return (
    <div className="ci">
      <div className="ic" aria-hidden="true">
        <Icon n={icon} />
      </div>
      <div>
        <strong>{title}</strong>
        <br />
        {children}
      </div>
    </div>
  );
}

// Contact details and the enquiry form. A message is shown as "sent" ONLY after the database confirms it.
export default function Contact() {
  const { contact } = useSettings();
  const { contactHeading, contactText } = useBlock("home/intros");
  const [state, setState] = useState({ status: "idle", message: "" });

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setState({ status: "sending", message: "" });
    try {
      await submitEnquiry({
        name: String(d.get("name") || ""),
        email: String(d.get("email") || ""),
        interest: String(d.get("interest") || ""),
        message: String(d.get("message") || ""),
        website: String(d.get("website") || ""),
      });
      form.reset();
      setState({ status: "sent", message: "Thank you. Your message has been received and we will get back to you." });
    } catch (err) {
      setState({ status: "error", message: err.message });
    }
  }

  const sending = state.status === "sending";
  return (
    <section id="contact">
      <div className="wrap split" style={{ alignItems: "start" }}>
        <div>
          <h2>{contactHeading}</h2>
          <p>{contactText}</p>
          <Row icon="phone" title="Phone">{contact.phone}</Row>
          <Row icon="mail" title="Email">{contact.email}</Row>
          <Row icon="pin" title="Address">{contact.address}</Row>
        </div>
        <form className="card" onSubmit={onSubmit} noValidate={false}>
          <label htmlFor="n">
            Your name
            <input id="n" name="name" required minLength={2} maxLength={120} autoComplete="name" disabled={sending} />
          </label>
          <label htmlFor="e">
            Email address
            <input id="e" name="email" type="email" required maxLength={254} autoComplete="email" disabled={sending} />
          </label>
          <label htmlFor="i">
            I’m interested in
            <select id="i" name="interest" disabled={sending}>
              {["Volunteering", "Partnership", "Donating", "Something else"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label htmlFor="m">
            Message
            <textarea id="m" name="message" rows="4" required minLength={5} maxLength={5000} disabled={sending} />
          </label>
          {/* Hidden trap for spam bots: real people never see or fill this in. */}
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button className="btn btn-green" type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send message"}
          </button>
          {state.status === "sent" && (
            <p className="msg" role="status">{state.message}</p>
          )}
          {state.status === "error" && (
            <p className="msg err" role="alert">{state.message}</p>
          )}
        </form>
      </div>
    </section>
  );
}
