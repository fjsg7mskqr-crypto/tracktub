const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need a cleaner to use this?",
    a: "No. Use it yourself, or hand the guided capture to whoever does your turnover — it's built for one-person operations.",
  },
  {
    q: "What does my guest or owner see?",
    a: "A clean, read-only link with the photos, timestamp, and verification — no login, nothing to install.",
  },
  {
    q: "I already take photos. Why this?",
    a: "Camera-roll photos aren't stamped on a trusted clock, locked against edits, or shareable as proof. TrackTub makes them count.",
  },
  {
    q: "Is it hard to set up?",
    a: "Add one property and you're capturing in a few minutes. Free to start, no card.",
  },
  {
    q: "What about privacy?",
    a: "The photos are yours. Share links show only what you choose to send; nothing is public.",
  },
  {
    q: "Do I need to know hot tub chemistry?",
    a: "No — the guided set is just photos. Simple water reminders are coming to help, not to require expertise.",
  },
];

/** Native <details> accordion — semantic, keyboard-accessible, no client JS. */
export function Faq() {
  return (
    <div className="faq">
      {FAQS.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
