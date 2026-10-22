import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { Lockup, Mark, Waterline } from "./_marks";
import { LandingWaitlist } from "./LandingWaitlist";
import { Faq, LANDING_FAQS } from "./Faq";
import { marketingMetadata } from "@/lib/marketing-seo";

// MUST stay dynamic — see the note in src/app/login/layout.tsx (#41, #271, #281).
// The enforcing CSP is nonce-based with 'strict-dynamic', so a prerendered page
// is served as frozen, nonce-less HTML and every script on it is blocked. On
// this page that killed the waitlist form: LandingWaitlist is a client component
// using useActionState with no `permalink`, which React does not progressively
// enhance on a statically rendered page, so with JS blocked it cannot submit.
export const dynamic = "force-dynamic";

export const metadata: Metadata = marketingMetadata({
  title: "TrackTub — know your hot tub was guest-ready",
  description:
    "For self-managed STR hosts: capture each hot-tub turnover with a server timestamp, lock it after submit, and share it in one tap. Free for your first property.",
  pathname: "/landing",
});

const PLATES = [
  { src: "/landing/full-frame.jpg", label: "Full frame" },
  { src: "/landing/water-level.jpg", label: "Water level/clarity" },
  { src: "/landing/control-panel.jpg", label: "Control panel" },
  { src: "/landing/water-chemistry.jpg", label: "Water chemistry" },
];

/** Small green check used across the proof card + pricing. */
function Check({ size = 11, color = "#04240f", w = 3.2 }: { size?: number; color?: string; w?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4 4 9-10" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="tt-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "TrackTub",
            applicationCategory: "BusinessApplication",
            description:
              "Guest-ready hot tub proof for self-managed short-term-rental hosts.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: LANDING_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <div className="wrap">
        {/* NAV */}
        <div className="nav">
          <Lockup className="brandlockup" />
          <div className="navlinks">
            <a href="#why">Why it matters</a>
            <a href="#how">How it works</a>
            <Link href="/blog">Resources</Link>
            <a href="#faq">FAQ</a>
          </div>
          <div className="sp">
            <a href="#join" className="btn sm">
              Get early access
            </a>
          </div>
        </div>

        {/* HERO */}
        <div className="hero">
          <svg
            className="wmark"
            viewBox="0 0 256 16"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M0 8 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0"
              stroke="#3B82F6"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
          <div>
            <h1>
              Know your hot <span className="tub">tub</span> was guest-ready — without being there.
            </h1>
            <p className="sub">
              Every turnover, you or your cleaner snap a quick guided photo set. TrackTub stamps the time on our server and
              locks the record once it&rsquo;s submitted — so you have a record the tub was clean, safe, and ready, and
              a link to share the moment anyone asks.
            </p>
            <LandingWaitlist />
            <div className="trust">
              <span className="vchip">
                <Check color="#34D399" w={3} />
                Free for your first property
              </span>
              <span>No app to install</span>
            </div>
          </div>

          <div className="proofwrap">
            <div className="glow" />
            <div className="glass proof" id="proof">
              <div className="ph">
                <span className="pid">Lakeside Cottage · Jun 7, 2026</span>
                <Mark className="markseal" label="TrackTub record" />
              </div>
              <div className="plates">
                {PLATES.map((p) => (
                  <div key={p.label} className="plate photo" style={{ backgroundImage: `url(${p.src})` }}>
                    <span className="ck">
                      <Check />
                    </span>
                    <b>{p.label}</b>
                  </div>
                ))}
              </div>
              <div className="meta">
                <span>
                  Camera capture <b>✓</b>
                </span>
                <span>·</span>
                <span>
                  Server time <b>✓</b>
                </span>
                <span>·</span>
                <span>
                  Locked <b>✓</b>
                </span>
              </div>
              <div className="pfoot">
                <span className="vtag">
                  <Check size={12} w={3} />
                  TrackTub record
                </span>
                <span className="ts">2026-06-07 · 14:22 UTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* WHY IT MATTERS */}
        <div className="section" id="why">
          <span className="eyebrow">Peace of mind</span>
          <div className="sechead">
            <h2>You can&rsquo;t be at every check-in. Now you don&rsquo;t have to be.</h2>
          </div>
          <div className="feat">
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M5 12.5l4 4 9-10" />
                </svg>
              </div>
              <h3>Know it got done</h3>
              <p>A clear, guided routine every turnover, so nothing gets skipped — even when someone else does the clean.</p>
            </div>
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
              </div>
              <h3>Know it was safe &amp; ready</h3>
              <p>
                Water level, clarity, and the control panel, captured every time.
              </p>
            </div>
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#3B82F6)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M7 3.5h7l4 4v13H7z" />
                  <path d="M9.5 13l2 2 3.5-4" />
                </svg>
              </div>
              <h3>Prove it if anyone asks</h3>
              <p>A timestamped, locked record and a share link — for the owner, the guest, or anyone who asks.</p>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="section" id="how">
          <span className="eyebrow">How it works</span>
          <div className="sechead">
            <h2>Three steps. Under ten minutes.</h2>
          </div>
          <div className="feat">
            <div className="glass fcard">
              <div className="ichip num">1</div>
              <h3>Snap the guided set</h3>
              <p>The same guided shots every turnover, taken with your phone&rsquo;s camera. No app to install.</p>
            </div>
            <div className="glass fcard">
              <div className="ichip num">2</div>
              <h3>Timestamped and locked</h3>
              <p>TrackTub stamps the time on our server the moment it&rsquo;s saved, then locks the record so it can&rsquo;t be edited in the app or back-dated.</p>
            </div>
            <div className="glass fcard">
              <div className="ichip num">3</div>
              <h3>Share it or just relax</h3>
              <p>Keep it as peace of mind, or send a one-tap link to an owner, guest, or Airbnb. They open it — no login.</p>
            </div>
          </div>
        </div>

        {/* LIFESTYLE BAND */}
        <div className="section">
          <div className="glass band" style={{ backgroundImage: "url(/landing/cabin.jpg)" }}>
            <div className="bandcopy">
              <h2>Built for the way you actually host.</h2>
              <p>One person, a few places, a tub that has to be right before every guest checks in.</p>
            </div>
          </div>
        </div>

        {/* FEATURE SHOWCASE */}
        <div className="section" id="record">
          <span className="eyebrow">What&rsquo;s in the record</span>
          <div className="sechead">
            <h2>Everything that rides along with every turnover</h2>
            <p>A guided photo set becomes a record you can actually stand behind.</p>
          </div>
          <div className="feat">
            {/* 1 — Guided photos */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M3 8.5A1.5 1.5 0 014.5 7H7l1.2-1.8h7.6L17 7h2.5A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </div>
              <h3>Guided photos</h3>
              <p>Full frame, water level, control panel, water chemistry — the same set every clean.</p>
              <div className="ui">
                <div className="uigrid">
                  {["Full frame", "Water level", "Control panel", "Water chemistry"].map((l) => (
                    <div key={l} className="uichk">
                      <Check size={13} color="#34D399" w={3} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2 — Server timestamp */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 7.5V12l3 2" />
                </svg>
              </div>
              <h3>Server timestamp</h3>
              <p>Stamped the moment it&rsquo;s submitted — our clock, never the cleaner&rsquo;s phone.</p>
              <div className="ui">
                <div className="uilog">
                  {[
                    ["14:22:07", "Photos submitted"],
                    ["14:22:08", "Server-stamped"],
                    ["14:22:08", "Record locked"],
                  ].map(([t, label]) => (
                    <div key={label} className="uirow">
                      <span className="t">{t}</span>
                      {label}
                      <span className="ok">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 — Locked after submit */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#3B82F6)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <rect x="5" y="11" width="14" height="9" rx="2.2" />
                  <path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
              </div>
              <h3>Locked after submit</h3>
              <p>Once it&rsquo;s submitted, the record can&rsquo;t be edited in TrackTub, and the timestamp can&rsquo;t be back-dated.</p>
              <div className="ui">
                <div className="uifield">
                  <span className="l">
                    <svg className="uiic" width="13" height="13" viewBox="0 0 24 24">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 018 0v3" />
                    </svg>
                    <span className="mono">Record locked</span>
                  </span>
                  <span className="uiok">no edits ✓</span>
                </div>
              </div>
            </div>

            {/* 4 — One-tap share link */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#60A5FA,#3B82F6)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <circle cx="6.5" cy="12" r="2.4" />
                  <circle cx="17.5" cy="6.5" r="2.4" />
                  <circle cx="17.5" cy="17.5" r="2.4" />
                  <path d="M8.7 10.9l6.6-3.3M8.7 13.1l6.6 3.3" />
                </svg>
              </div>
              <h3>One-tap share link</h3>
              <p>Send the record to an owner, guest, or anyone who asks. They open it — no login, nothing to install.</p>
              <div className="ui">
                <div className="uifield">
                  <span className="mono">tracktub.app/p/lakeside</span>
                  <span className="uib pri xs">Copy</span>
                </div>
                <div className="uibtns">
                  <span className="uib sec">Owner</span>
                  <span className="uib sec">Guest</span>
                  <span className="uib sec">Airbnb</span>
                </div>
              </div>
            </div>

            {/* 5 — Camera capture */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M3 8.5A1.5 1.5 0 014.5 7H7l1.2-1.8h7.6L17 7h2.5A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </div>
              <h3>Taken, not uploaded</h3>
              <p>Photos come straight from the phone&rsquo;s camera at the tub — not picked out of an old camera roll.</p>
              <div className="ui">
                <div className="uifield">
                  <span className="mono">Source: camera</span>
                  <span className="uiok">live capture ✓</span>
                </div>
              </div>
            </div>

            {/* 6 — Audit trail */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M7 3.5h7l4 4v13H7z" />
                  <path d="M14 3.5v4h4" />
                  <path d="M9.5 12.5h5M9.5 16h5" />
                </svg>
              </div>
              <h3>Audit trail</h3>
              <p>Every photo and every change is logged with who and when — and the log itself can&rsquo;t be edited.</p>
              <div className="ui">
                <div className="uilog">
                  {[
                    ["14:22:07", "Turnover created"],
                    ["14:22:08", "4 photos added"],
                    ["14:22:08", "Submitted & locked"],
                  ].map(([t, label]) => (
                    <div key={label} className="uirow">
                      <span className="t">{t}</span>
                      {label}
                      <span className="ok">✓</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="section" id="faq">
          <span className="eyebrow">Questions</span>
          <div className="sechead">
            <h2>The stuff hosts ask first.</h2>
          </div>
          <Faq />
        </div>

        {/* LAUNCH / CTA */}
        <div className="glass cta" id="join">
          <Mark className="markbig" />
          <span className="eyebrow" style={{ display: "block", marginBottom: 9 }}>
            Launching soon · building in public
          </span>
          <h2>Be one of the first hosts on TrackTub.</h2>
          <p>
            We&rsquo;re onboarding hosts in small batches and shipping in the open. Join the early-access list, then
            follow the build on X.
          </p>
          <LandingWaitlist />
          <a className="xfollow" href="https://x.com/tracktub" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor" />
            </svg>
            Follow @tracktub on X
          </a>
        </div>

        {/* FOOTER */}
        <footer>
          <Lockup className="flock" />
          <div className="fwater">
            <Waterline strokeWidth={1.4} />
          </div>
          <div className="fcopy">© 2026 TrackTub</div>
          <Link href="/blog" className="flink">
            Resources
          </Link>
          <a className="fx" href="https://x.com/tracktub" target="_blank" rel="noopener noreferrer" aria-label="TrackTub on X">
            <svg viewBox="0 0 24 24" width="15" height="15">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </footer>
      </div>
    </div>
  );
}
