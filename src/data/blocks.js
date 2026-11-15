// Editable blocks of the public home page.
// Each block has: a label for the dashboard, a "schema" (the form the dashboard shows) and
// "defaults" (the wording the website shows until an administrator saves their own version).
import { SLIDES, PILLARS, STATS, ACC, INV } from "./content.js";

export const ICON_NAMES = ["book", "briefcase", "star", "home", "heart", "users", "cap", "droplet", "steth", "sprout", "leaf", "link", "phone", "mail", "pin"];

const iconField = { key: "icon", label: "Icon", type: "select", options: ICON_NAMES };

export const BLOCKS = {
  "home/hero": {
    label: "Hero (top banner)",
    help: "The rotating messages at the top of the page. Each message can have its own photo.",
    schema: [
      {
        key: "slides", label: "Messages", type: "list", min: 1, max: 5, itemLabel: "Message",
        fields: [
          { key: "title", label: "Headline", type: "text", required: true, max: 120 },
          { key: "text", label: "Supporting text", type: "textarea", required: true, max: 300 },
          { key: "image", label: "Photo (optional)", type: "image" },
        ],
      },
    ],
    defaults: { slides: SLIDES.map(([title, text]) => ({ title, text, image: "" })) },
  },
  "home/pillars": {
    label: "Four ideas strip (Learn, Earn, Lead, Belong)",
    help: "The four short cards just under the banner.",
    schema: [
      {
        key: "items", label: "Cards", type: "list", min: 1, max: 4, itemLabel: "Card",
        fields: [
          { key: "title", label: "Title", type: "text", required: true, max: 30 },
          { key: "text", label: "Short sentence", type: "text", required: true, max: 90 },
          iconField,
        ],
      },
    ],
    defaults: { items: PILLARS.map(([icon, title, text]) => ({ icon, title, text })) },
  },
  "home/about": {
    label: "Who we are",
    help: "The introduction to PIDA.",
    schema: [
      { key: "heading", label: "Heading", type: "text", required: true, max: 60 },
      { key: "paragraphs", label: "Paragraphs (one per line)", type: "lines", required: true, max: 700 },
      { key: "ticks", label: "Tick-list points (one per line)", type: "lines", max: 120 },
      { key: "image", label: "Photo (optional)", type: "image" },
    ],
    defaults: {
      heading: "Who we are",
      paragraphs: [
        "PIDA is a women-led, community-based organisation, established in 2014, working to improve the socioeconomic conditions of rural communities in Busia District, Eastern Uganda. We work mainly with in-school and out-of-school adolescents, single mothers and underserved households.",
        "Our mission is to empower vulnerable girls, youth and women through education support, skills development and household economic strengthening.",
      ],
      ticks: ["Established 2014 in Busia District", "Community-based Girls Not Brides member"],
      image: "",
    },
  },
  "home/impact": {
    label: "Local action, real community value (figures)",
    help: "Use only figures PIDA can verify. The numbers count up on the page.",
    schema: [
      { key: "heading", label: "Heading", type: "text", required: true, max: 80 },
      { key: "note", label: "Note under the heading", type: "textarea", max: 300 },
      {
        key: "stats", label: "Figures", type: "list", min: 1, max: 4, itemLabel: "Figure",
        fields: [
          { key: "value", label: "Number", type: "number", required: true, min: 1, max: 1000000 },
          { key: "suffix", label: "After the number (for example +)", type: "text", max: 3 },
          { key: "label", label: "What it measures", type: "text", required: true, max: 80 },
          iconField,
        ],
      },
    ],
    defaults: {
      heading: "Local action, real community value",
      note: "Reported figures from PIDA’s organisational profile. Confirm reporting periods and supporting documents before using them in grant submissions.",
      stats: STATS.map(([icon, value, suffix, label]) => ({ icon, value, suffix, label })),
    },
  },
  "home/vision": {
    label: "A mission of lasting change",
    help: "Mission, vision and values.",
    schema: [
      { key: "heading", label: "Heading", type: "text", required: true, max: 80 },
      { key: "intro", label: "Introduction", type: "text", max: 160 },
      {
        key: "items", label: "Items", type: "list", min: 1, max: 6, itemLabel: "Item",
        fields: [
          { key: "title", label: "Title", type: "text", required: true, max: 40 },
          { key: "text", label: "Text", type: "textarea", required: true, max: 400 },
          iconField,
        ],
      },
      { key: "image", label: "Photo (optional)", type: "image" },
    ],
    defaults: {
      heading: "A mission of lasting change",
      intro: "What guides our work, in PIDA’s own words.",
      items: ACC.map(([title, text], n) => ({ title, text, icon: ["star", "sprout", "heart", "users"][n] || "star" })),
      image: "",
    },
  },
  "home/involved": {
    label: "Get involved",
    help: "Volunteer, partner and donate cards and the call-to-action band.",
    schema: [
      { key: "heading", label: "Heading", type: "text", required: true, max: 60 },
      { key: "intro", label: "Introduction", type: "text", max: 160 },
      {
        key: "cards", label: "Cards", type: "list", min: 1, max: 3, itemLabel: "Card",
        fields: [
          { key: "title", label: "Title", type: "text", required: true, max: 30 },
          { key: "points", label: "Statements (one per line)", type: "lines", required: true, max: 90 },
          { key: "button", label: "Button text", type: "text", required: true, max: 30 },
          iconField,
        ],
      },
      { key: "ctaTitle", label: "Band headline", type: "text", max: 60 },
      { key: "ctaText", label: "Band text", type: "text", max: 160 },
    ],
    defaults: {
      heading: "Get involved",
      intro: "Help locally led solutions reach more girls, women and families.",
      cards: INV.map(([icon, title, points, button]) => ({ icon, title, points, button })),
      ctaTitle: "Be part of the impact.",
      ctaText: "Tell us how you would like to help and we will get in touch.",
    },
  },
  "home/intros": {
    label: "Section headings (Our work, News, Contact)",
    help: "The headings and short introductions above the programmes, news and contact sections.",
    schema: [
      { key: "programmesHeading", label: "Our work: heading", type: "text", required: true, max: 60 },
      { key: "programmesText", label: "Our work: introduction", type: "text", max: 200 },
      { key: "newsHeading", label: "News: heading", type: "text", required: true, max: 60 },
      { key: "newsText", label: "News: introduction", type: "text", max: 200 },
      { key: "contactHeading", label: "Contact: heading", type: "text", required: true, max: 60 },
      { key: "contactText", label: "Contact: introduction", type: "text", max: 200 },
    ],
    defaults: {
      programmesHeading: "Our work",
      programmesText: "Integrated support for stronger rural communities, because community challenges do not exist in isolation.",
      newsHeading: "Latest news and updates",
      newsText: "Real updates, shared with the consent of the people involved, will go here.",
      contactHeading: "Contact us",
      contactText: "We would love to hear from you.",
    },
  },
};

export const DEFAULT_SETTINGS = {
  organisation: { name: "Pearl Integrated Development Agency", short_name: "PIDA" },
  contact: {
    phone: "+256 752 698589",
    email: "info@pidauganda.org",
    address: "Milo 8 Trading Centre along Busia–Majanji–Musita Highway, P.O. Box 496, Busia, Uganda",
  },
};

// Use the saved content when it has the right shape; otherwise fall back to the default for that field.
export function mergeBlock(defaults, saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;
  const out = {};
  for (const k of Object.keys(defaults)) {
    const d = defaults[k];
    const v = saved[k];
    if (Array.isArray(d)) out[k] = Array.isArray(v) && v.length > 0 ? v : d;
    else if (typeof d === "number") out[k] = typeof v === "number" ? v : d;
    else out[k] = typeof v === "string" ? v : d;
  }
  return out;
}
