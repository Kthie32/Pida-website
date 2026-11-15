import { api, mediaUrl } from "./http.js";

// Public (visitor) side of the backend. Visitors can only read PUBLISHED content and send enquiries;
// the server enforces this, not this code.
export { mediaUrl };

// Loads everything the public page can show. Returns null if the server cannot be reached,
// in which case the website keeps showing its built-in content.
export async function loadPublicContent() {
  try {
    return await api("/public/content");
  } catch {
    return null;
  }
}

const FRIENDLY = {
  invalid_name: "Please enter your name (at least 2 letters).",
  invalid_email: "Please enter a valid email address.",
  invalid_interest: "Please choose one of the listed topics.",
  invalid_message: "Please write a message of at least 5 characters (maximum 5000).",
  rate_limited: "We have received several messages from you already. Please try again later, or call us.",
};

// Sends an enquiry. Resolves ONLY when the server confirms it was stored.
export async function submitEnquiry({ name, email, interest, message, website }) {
  try {
    await api("/public/enquiries", { method: "POST", body: { name, email, interest, message, website: website || "" } });
  } catch (e) {
    if (FRIENDLY[e.message]) throw new Error(FRIENDLY[e.message]);
    if (e.status === 0) throw new Error("We could not reach the server. Please check your internet connection and try again.");
    throw new Error("Sorry, your message could not be sent. Please try again, or call or email us.");
  }
  return true;
}
