import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { Seal } from "@/components/Seal";
import { WaitlistForm } from "@/components/WaitlistForm";

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

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "camera",
    title: "1 · Capture",
    body: "Staff open a link and shoot 4 guided photos — wide, waterline, panel, cover. Under 10 minutes.",
  },
  {
    icon: "lock",
    title: "2 · Lock",
    body: "TrackTub stamps the record server-side and locks it. Immutable after submit — not the cleaner's clock.",
  },
  {
    icon: "share",
    title: "3 · Share",
    body: "One tap to the owner, guest, or Airbnb. They open the proof link — no login, nothing to install.",
  },
];

const SLOTS = ["wide", "waterline", "panel", "cover"];

/** Subtle full-width waterline divider (the brand device). */
function Waterline() {
  return (
    <svg
      width="100%"
      height="14"
      viewBox="0 0 256 12"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      style={{ opacity: 0.45, display: "block" }}
    >
      <path
        d="M0 8 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
        stroke="var(--brand-blue)"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="stack" style={{ gap: 26 }}>
      {/* hero */}
      <section
        className="card pad"
        style={{
          background:
            "radial-gradient(120% 120% at 0% -20%, rgba(59,130,246,.12), transparent 50%), linear-gradient(160deg, var(--surface-2), var(--surface))",
          padding: "40px 30px",
        }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28, alignItems: "center" }}
        >
          {/* left: pitch + waitlist */}
          <div>
            <span className="badge brand">For short-term-rental operators</span>
            <h1 style={{ fontSize: 36, marginTop: 12, maxWidth: 560, lineHeight: 1.1 }}>
              Guest-ready hot tub proof for every turnover.
            </h1>
            <p className="muted" style={{ fontSize: 17, maxWidth: 520, marginTop: 12 }}>
              The dispute-grade evidence layer for STR turnovers. Your cleaners
              capture it; you prove it; owners and guests trust it.
            </p>
            <div style={{ marginTop: 18 }}>
              <WaitlistForm />
            </div>
            <div className="row wrap" style={{ marginTop: 12, gap: 14 }}>
              <Link href="/" className="btn ghost sm">
                See the live cockpit →
              </Link>
              <span className="tiny dim">Photos are human-confirmed.</span>
            </div>
          </div>

          {/* right: coded proof mockup */}
          <div
            className="card pad"
            style={{ background: "var(--bg)", borderColor: "var(--border-strong)" }}
            aria-label="Example proof record"
          >
            <div className="spread">
              <span className="eyebrow">PROOF · /p/ab12cd</span>
              <Seal size={18} />
            </div>
            <div className="photos" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12, gap: 8 }}>
              {SLOTS.map((s) => (
                <div
                  key={s}
                  style={{
                    aspectRatio: "4 / 3",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface-2)",
                    display: "flex",
                    alignItems: "flex-end",
                    padding: 7,
                  }}
                >
                  <span className="mono" style={{ fontSize: 9.5, color: "var(--text-dim)" }}>
                    {s} ✓
                  </span>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
              <span className="badge ok">✓ VERIFIED</span>
              <span className="mono" style={{ fontSize: 10.5, color: "var(--text-lo)" }}>
                2026-06-07 14:22 UTC
              </span>
            </div>
          </div>
        </div>
      </section>

      <Waterline />

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
                color: "var(--brand-blue)",
                background: "var(--brand-blue-dim)",
                border: "1px solid var(--brand-blue-line)",
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

      {/* how verification works */}
      <section className="card pad">
        <div className="sectionhead">
          <h2>How verification works</h2>
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 16 }}
        >
          {STEPS.map((s) => (
            <div key={s.title}>
              <span style={{ color: "var(--brand-blue)", display: "inline-flex" }}>
                <Icon name={s.icon} size={22} />
              </span>
              <h3 style={{ fontSize: 16, marginTop: 8 }}>{s.title}</h3>
              <p className="muted small" style={{ marginTop: 4 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
        <p className="tiny dim" style={{ marginTop: 16 }}>
          Server-side timestamp + immutable-after-submit. No edits, no
          back-dating — the record holds up in a dispute.
        </p>
      </section>

      {/* pricing */}
      <section className="card pad" id="pricing">
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
      </section>

      {/* final CTA */}
      <section
        className="card pad"
        style={{ textAlign: "center", padding: "34px 24px" }}
      >
        <Seal size={40} style={{ margin: "0 auto" }} />
        <h2 style={{ fontSize: 22, marginTop: 12 }}>
          Get proof on every turnover.
        </h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          Join the waitlist — we&rsquo;re onboarding operators in small batches.
        </p>
        <div style={{ marginTop: 16, display: "inline-flex" }}>
          <WaitlistForm />
        </div>
      </section>

      <p className="tiny dim" style={{ textAlign: "center" }}>
        Draft landing page · not yet live · TrackTub
      </p>
    </div>
  );
}
