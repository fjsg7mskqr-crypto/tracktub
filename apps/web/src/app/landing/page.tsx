import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

const BENEFITS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "shield",
    title: "Guest-ready compliance",
    body: "Prove the tub was safe and clean on check-in day — every turnover, every property.",
  },
  {
    icon: "file",
    title: "Dispute insurance",
    body: "A timestamped, tamper-evident proof link to settle owner and guest disputes fast.",
  },
  {
    icon: "grid",
    title: "Multi-property cockpit",
    body: "One screen for every tub you manage: last visit, photos, open issues, alerts.",
  },
];

const STEPS = [
  ["Capture", "Staff open a link, shoot 4 guided photos, add notes. Under 10 minutes."],
  ["Prove", "TrackTub locks the record with a server timestamp and a shareable proof link."],
  ["Share", "One tap to the owner, guest, or Airbnb. They open it — no login."],
];

export default function Landing() {
  return (
    <div className="stack" style={{ gap: 26 }}>
      {/* hero */}
      <section
        className="card pad"
        style={{
          background:
            "radial-gradient(120% 120% at 0% -20%, rgba(52,211,153,.10), transparent 50%), linear-gradient(160deg, var(--surface-2), var(--surface))",
          padding: "40px 30px",
        }}
      >
        <span className="badge brand">For short-term-rental operators</span>
        <h1 style={{ fontSize: 34, marginTop: 12, maxWidth: 680, lineHeight: 1.12 }}>
          Guest-ready hot tub proof for every turnover.
        </h1>
        <p className="muted" style={{ fontSize: 17, maxWidth: 600, marginTop: 12 }}>
          The dispute-grade evidence layer for STR turnovers. Your cleaners
          capture it; you prove it; owners and guests trust it.
        </p>
        <div className="row wrap" style={{ marginTop: 18 }}>
          <Link href="/" className="btn primary">
            Open the live cockpit →
          </Link>
          <a className="btn" href="#pilot">
            Book a pilot
          </a>
        </div>
        <p className="tiny dim" style={{ marginTop: 12 }}>
          Photos are human-confirmed. Free for your first property.
        </p>
      </section>

      {/* benefits */}
      <section
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
      >
        {BENEFITS.map((b) => (
          <div key={b.title} className="card pad">
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                color: "var(--verified)",
                background: "var(--verified-dim)",
                border: "1px solid var(--verified-line)",
              }}
            >
              <Icon name={b.icon} size={21} />
            </div>
            <h3 style={{ fontSize: 18, marginTop: 12 }}>{b.title}</h3>
            <p className="muted small" style={{ marginTop: 6 }}>
              {b.body}
            </p>
          </div>
        ))}
      </section>

      {/* how it works */}
      <section className="card pad">
        <h2 style={{ fontSize: 20 }}>How it works</h2>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            marginTop: 14,
          }}
        >
          {STEPS.map(([t, b], i) => (
            <div key={t}>
              <div className="badge brand" style={{ marginBottom: 8 }}>
                Step {i + 1}
              </div>
              <h3 style={{ fontSize: 16 }}>{t}</h3>
              <p className="muted small" style={{ marginTop: 4 }}>
                {b}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section className="card pad" id="pilot">
        <div className="spread wrap" style={{ gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>Simple pricing</h2>
            <p className="muted small" style={{ marginTop: 6, maxWidth: 380 }}>
              Start free with one property. Scale to your whole portfolio at a
              flat per-property rate.
            </p>
          </div>
          <div className="row wrap">
            <div className="tile" style={{ minWidth: 150 }}>
              <div className="k">Free</div>
              <div className="v">$0</div>
              <div className="sub">1 property, all features</div>
            </div>
            <div className="tile" style={{ minWidth: 150 }}>
              <div className="k">Pro</div>
              <div className="v">
                $12<span className="small dim">/property</span>
              </div>
              <div className="sub">2+ properties / month</div>
            </div>
          </div>
        </div>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <Link href="/add-property" className="btn primary">
            Add a property
          </Link>
          <Link href="/" className="btn ghost">
            See the cockpit
          </Link>
        </div>
      </section>

      <p className="tiny dim" style={{ textAlign: "center" }}>
        Demo landing page · TrackTub · built for the thin-MVP walkthrough
      </p>
    </div>
  );
}
