/** Round 6 landing copy + data. Kept out of the components so the page, the
 *  FAQPage JSON-LD and the tests all read one source. */

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Does the owner need an app or a login?",
    a: "No. The report is a web link. It opens on any phone or computer.",
  },
  {
    q: "Are photos taken during the visit?",
    a: "That is the idea. On a phone, the app opens the camera, not the photo library. Each photo also shows the time it was taken.",
  },
  {
    q: "Can a finished report be changed?",
    a: "No. When the visit is finished, the record locks and can’t be edited in TrackTub.",
  },
  {
    q: "Does it tell me what to add?",
    a: "No. Each test shows its target range and marks anything outside it. What to add is your call. TrackTub records the readings and what you added.",
  },
  {
    q: "Does a photo show where it was taken?",
    a: "No. The app removes the location data before the photo leaves the phone.",
  },
  {
    q: "What if the water was off when we arrived?",
    a: "The report shows both readings: as found, and as left. The owner sees the fix, not just the problem.",
  },
  {
    q: "Can I keep all my clients and tubs in one place?",
    a: "Yes. Each client has their tubs, and each tub keeps its own history: visits, drains and filter dates.",
  },
  {
    q: "What does it cost?",
    a: "Your first property is free. Pricing for more properties comes at launch.",
  },
];

export const PHONES = [
  {
    src: "/landing/screen-home.png",
    alt: "Home: today’s route and status board",
    title: "Today’s route",
    sub: "Which tub needs you first",
    offset: false,
  },
  {
    src: "/landing/screen-visit.png",
    alt: "Visit screen with photo steps",
    title: "The visit",
    sub: "Step by step at the tub",
    offset: true,
  },
  {
    src: "/landing/screen-tub.png",
    alt: "A tub’s page with drain and filter timing",
    title: "Each tub’s history",
    sub: "Drains, filters, last visit",
    offset: false,
  },
  {
    src: "/landing/screen-calendar.png",
    alt: "Calendar of upcoming visits",
    title: "Calendar",
    sub: "The week ahead",
    offset: true,
  },
  {
    src: "/landing/screen-reports.png",
    alt: "Reports sent to owners",
    title: "Reports",
    sub: "See when a link is opened",
    offset: false,
  },
];

export const SHOTS = [
  { src: "/landing/report-before.jpg", label: "Before", time: "1:52 PM" },
  { src: "/landing/report-after.jpg", label: "After", time: "2:11 PM" },
  { src: "/landing/report-cover-on.jpg", label: "Cover on", time: "2:13 PM" },
];

export const ROWS = [
  {
    label: "Alkalinity",
    sw: "#1f8f96",
    found: "60",
    left: "90",
    target: "80–120 ppm",
    off: true,
  },
  {
    label: "pH",
    sw: "#f2b52f",
    found: "7.0",
    left: "7.4",
    target: "7.2–7.8",
    off: true,
  },
  {
    label: "Hardness",
    sw: "#6d8bd6",
    found: "180",
    left: "180",
    target: "150–250 ppm",
    off: false,
  },
  {
    label: "Chlorine",
    sw: "#8a4fbf",
    found: "0.5",
    left: "4.0",
    target: "3–10 ppm",
    off: true,
  },
];

export const GROUPS = [
  {
    title: "Photos",
    items: [
      {
        k: "Camera first.",
        v: "On a phone, the app opens the camera, not the photo library.",
      },
      { k: "Three photo steps.", v: "Before, after, and cover on." },
      {
        k: "Lined up.",
        v: "Last visit’s photo sits next to the step so you can match the angle.",
      },
    ],
  },
  {
    title: "Water",
    items: [
      {
        k: "Chlorine tubs.",
        v: "Alkalinity, pH, hardness and chlorine.",
      },
      {
        k: "As found and as left.",
        v: "Both readings, so a fix shows as a fix.",
      },
      { k: "Products added.", v: "Each product with its amount." },
    ],
  },
  {
    title: "The record",
    items: [
      { k: "Timed.", v: "Each photo shows the time it was taken." },
      { k: "Locked.", v: "A finished visit can’t be edited in TrackTub." },
      {
        k: "Carried forward.",
        v: "Open items and drain and filter dates follow the tub.",
      },
    ],
  },
  {
    title: "Sharing and privacy",
    items: [
      { k: "One link.", v: "Owners open the report without an app or login." },
      { k: "Open times.", v: "See when a report link is opened." },
      {
        k: "No location.",
        v: "Location data is removed before a photo leaves the phone.",
      },
    ],
  },
];

function bar(
  label: string,
  found: number,
  left: number,
  lo: number,
  hi: number,
  min: number,
  max: number,
  unit: string,
  band: string,
  dot: string
) {
  const digits = label === "pH" || label === "Chlorine" ? 1 : 0;
  const fmt = (v: number) => v.toFixed(digits);
  const pct = (v: number) =>
    Math.max(2, Math.min(98, ((v - min) / (max - min)) * 100));
  return {
    label,
    band,
    dot,
    found: pct(found),
    left: pct(left),
    lo: pct(lo),
    w: pct(hi) - pct(lo),
    text: `${fmt(found)} → ${fmt(left)}${unit ? ` ${unit}` : ""}`,
  };
}

export const BARS = [
  bar("Alkalinity", 60, 90, 80, 120, 40, 160, "ppm", "#bfe6e6", "#1f8f96"),
  bar("pH", 7.0, 7.4, 7.2, 7.8, 6.6, 8.2, "", "#fbe3a6", "#c98a06"),
  bar("Hardness", 180, 180, 150, 250, 50, 350, "ppm", "#d6e0f7", "#4d6fc4"),
  bar("Chlorine", 0.5, 4.0, 3, 10, 0, 12, "ppm", "#e7d6f3", "#8a4fbf"),
];
