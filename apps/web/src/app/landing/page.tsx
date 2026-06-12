import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { Lockup, Mark, Waterline } from "./_marks";
import { LandingWaitlist } from "./LandingWaitlist";
import { Faq } from "./Faq";

export const metadata: Metadata = {
  title: "TrackTub — know your hot tub was guest-ready",
  description:
    "For self-managed STR hosts: capture each hot-tub turnover, lock it as tamper-proof proof, and share it in one tap. Free for your first property.",
};

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
      <div className="wrap">
        {/* NAV */}
        <div className="nav glass">
          <Lockup className="brandlockup" />
          <div className="navlinks">
            <a href="#why">Why it matters</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="sp">
            <Link href="/login" className="btn ghost sm">
              Sign in
            </Link>
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
            <span className="chip">
              <span className="dot" />
              For self-managed hosts with a hot tub
            </span>
            <h1 style={{ marginTop: 18 }}>
              Know your hot <span className="tub">tub</span> was guest-ready — without being there.
            </h1>
            <p className="sub">
              Every turnover, you or your cleaner snap a quick guided photo set. TrackTub stamps the time, locks it,
              and confirms it was taken on-site — so you always have proof the tub was clean, safe, and ready, and a
              link to share the moment anyone asks.
            </p>
            <LandingWaitlist />
            <div className="trust">
              <span className="vchip">
                <Check color="#34D399" w={3} />
                Free for your first property
              </span>
              <span>No app to install · ~$12/property at 2+</span>
            </div>
          </div>

          <div className="proofwrap">
            <div className="glow" />
            <div className="glass proof" id="proof">
              <div className="ph">
                <span className="pid">Lakeside Cottage · Jun 7, 2026</span>
                <Mark className="markseal" label="TrackTub verified" />
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
                  Verified cleaner <b>✓</b>
                </span>
                <span>·</span>
                <span>
                  On-site <b>✓</b>
                </span>
                <span>·</span>
                <span>
                  Tamper-proof <b>✓</b>
                </span>
              </div>
              <div className="pfoot">
                <span className="vtag">
                  <Check size={12} w={3} />
                  TrackTub verified
                </span>
                <span className="ts">2026-06-07 · 14:22 UTC</span>
              </div>
            </div>
          </div>
        </div>

        {/* WATERLINE DIVIDER */}
        <div className="divider">
          <Waterline strokeWidth={1.6} />
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
                Water level, clarity, and the control panel, captured every time.{" "}
                <em>Coming: reminders so the water doesn&rsquo;t crash between back-to-back guests.</em>
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
              <p>A timestamped, locked record and a share link — for the owner, the guest, or an Airbnb claim.</p>
            </div>
          </div>
        </div>

        {/* COCKPIT */}
        <div className="section" id="cockpit">
          <span className="eyebrow">Your cockpit</span>
          <div className="sechead">
            <h2>Every tub, one glance.</h2>
            <p>
              Open the app and see which tubs are guest-ready right now — and which one needs five minutes before the
              next check-in.
            </p>
          </div>
          <div className="dashwrap">
            <div className="glass dash">
              <div className="dashhead">
                <span className="dashtitle">Your tubs</span>
                <span className="dashstat">
                  <span className="mdot" />
                  3 of 4 guest-ready
                </span>
              </div>
              <div className="drow">
                <div className="dprop">
                  <b>Lakeside Cottage</b>
                  <span className="dsub">Captured 2:22 PM · by you</span>
                </div>
                <span className="dstatus ok">
                  <Check size={12} color="#34D399" w={3} />
                  Guest-ready
                </span>
              </div>
              <div className="drow">
                <div className="dprop">
                  <b>Ridgeline A-Frame</b>
                  <span className="dsub">Captured 11:05 AM · by Maria</span>
                </div>
                <span className="dstatus ok">
                  <Check size={12} color="#34D399" w={3} />
                  Guest-ready
                </span>
              </div>
              <div className="drow">
                <div className="dprop">
                  <b>Big Bear Cabin 4</b>
                  <span className="dsub">Captured 9:40 AM · by you</span>
                </div>
                <span className="dstatus warn">Check water</span>
              </div>
              <div className="drow">
                <div className="dprop">
                  <b>Pinecrest Chalet</b>
                  <span className="dsub">Captured yesterday</span>
                </div>
                <span className="dstatus ok">
                  <Check size={12} color="#34D399" w={3} />
                  Guest-ready
                </span>
              </div>
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
              <p>Full frame, water, control panel, water chemistry — the same four shots every turnover, right from your phone. No app to install.</p>
            </div>
            <div className="glass fcard">
              <div className="ichip num">2</div>
              <h3>It locks itself</h3>
              <p>TrackTub stamps the time on our clock, confirms it was on-site, and locks the record so it can&rsquo;t be edited or back-dated.</p>
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
            <p>Four photos become a record you can actually stand behind.</p>
          </div>
          <div className="feat">
            {/* 1 — 4 guided photos */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M3 8.5A1.5 1.5 0 014.5 7H7l1.2-1.8h7.6L17 7h2.5A1.5 1.5 0 0121 8.5v9A1.5 1.5 0 0119.5 19h-15A1.5 1.5 0 013 17.5z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </div>
              <h3>4 guided photos</h3>
              <p>Full frame, water level, control panel, water chemistry — the same set every clean, in under ten minutes.</p>
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

            {/* 3 — Tamper-proof record */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#3B82F6)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <rect x="5" y="11" width="14" height="9" rx="2.2" />
                  <path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
              </div>
              <h3>Tamper-proof record</h3>
              <p>Locked the moment it&rsquo;s submitted. No edits, no back-dating — that&rsquo;s what makes it hold up.</p>
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
                <div className="uibtns">
                  <span className="uib sec">Re-verify</span>
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
              <p>Send proof to an owner, guest, or Airbnb. They open it — no login, nothing to install.</p>
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

            {/* 5 — Captured on-site */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#3B82F6,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
              </div>
              <h3>Captured on-site</h3>
              <p>A location check confirms the photos were taken at the property — not the parking lot.</p>
              <div className="ui">
                <div className="map">
                  <svg viewBox="0 0 300 110" preserveAspectRatio="xMidYMid slice">
                    <path d="M-20 80 L150 42 L320 62" stroke="rgba(255,255,255,.09)" strokeWidth="10" fill="none" strokeLinecap="round" />
                    <path d="M85 -20 L130 130" stroke="rgba(255,255,255,.06)" strokeWidth="7" fill="none" />
                    <path d="M215 -10 L242 125" stroke="rgba(255,255,255,.05)" strokeWidth="5" fill="none" />
                    <rect x="28" y="15" width="36" height="22" rx="2" fill="rgba(255,255,255,.05)" />
                    <rect x="247" y="74" width="42" height="26" rx="2" fill="rgba(255,255,255,.05)" />
                    <rect x="20" y="60" width="26" height="18" rx="2" fill="rgba(255,255,255,.04)" />
                    <circle cx="150" cy="60" r="37" fill="rgba(59,130,246,.10)" stroke="rgba(96,165,250,.78)" strokeWidth="1.3" strokeDasharray="5 4" />
                    <rect x="135" y="48" width="30" height="23" rx="2.5" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.28)" />
                    <circle cx="150" cy="60" r="6" fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.55">
                      <animate attributeName="r" values="6;23" dur="2.6s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="150" cy="60" r="5" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
                  </svg>
                  <span className="mtag">
                    <span className="mdot" />
                    Within geofence
                  </span>
                  <span className="mcompass">N</span>
                  <span className="mscale">
                    <i />
                    20 m
                  </span>
                  <span className="mread">±6 m</span>
                </div>
                <div className="uirow" style={{ marginTop: 7 }}>
                  <span className="mono">120 Lakeside Rd · 44.21°N, 7.69°W</span>
                  <span className="ok">verified ✓</span>
                </div>
              </div>
            </div>

            {/* 6 — Dispute-ready export */}
            <div className="glass fcard">
              <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#2563EB)" }}>
                <svg width="23" height="23" viewBox="0 0 24 24" className="ic">
                  <path d="M7 3.5h7l4 4v13H7z" />
                  <path d="M14 3.5v4h4" />
                  <path d="M9.5 13l2 2 3.5-4" />
                </svg>
              </div>
              <h3>Dispute-ready export</h3>
              <p>A clean PDF of the record for when a chargeback or owner question actually shows up.</p>
              <div className="ui">
                <div className="uifield">
                  <span className="l">
                    <svg className="uiic" width="13" height="13" viewBox="0 0 24 24">
                      <path d="M7 3.5h7l4 4v13H7z" />
                      <path d="M14 3.5v4h4" />
                    </svg>
                    <span className="mono">turnover-lakeside.pdf</span>
                  </span>
                  <span className="mono uiblue" style={{ flex: "none" }}>
                    142 KB
                  </span>
                </div>
                <div className="uibtns">
                  <span className="uib pri">Download PDF</span>
                  <span className="uib sec">Email</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STAYS GUEST-READY */}
        <div className="section" id="ready">
          <span className="eyebrow">More than a clean</span>
          <div className="sechead">
            <h2>A tub that stays guest-ready between guests.</h2>
          </div>
          <div className="glass readypanel">
            <div className="ptext">
              <p>
                Back-to-back bookings are when water chemistry crashes. TrackTub uses the photos you already take to
                flag cloudy water and nudge you when a heavy weekend means the tub needs attention — so the next guest
                steps into a tub that&rsquo;s actually ready. <em>(Rolling out as we learn what hosts need most.)</em>
              </p>
            </div>
            <div className="pimg" style={{ backgroundImage: "url(/landing/water.jpg)" }} aria-hidden="true" />
          </div>
        </div>

        {/* PRICING */}
        <div className="section" id="pricing">
          <span className="eyebrow">Simple pricing</span>
          <div className="sechead">
            <h2>Start free. Add properties when you grow.</h2>
          </div>
          <div className="price">
            <div className="glass pcard">
              <div className="k">Free</div>
              <div className="v">$0</div>
              <div className="d">Your first property, free. All features.</div>
              <ul>
                {["1 property", "Unlimited proofs & share links", "Server timestamp + tamper-proof record"].map((f) => (
                  <li key={f}>
                    <Check size={16} color="#60A5FA" w={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#join" className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>
                Start free
              </a>
            </div>
            <div className="glass pcard hot">
              <span className="tagtop">For portfolios</span>
              <div className="k">Pro</div>
              <div className="v">
                $12<small> /property / mo</small>
              </div>
              <div className="d">Everything in Free, across every tub you manage.</div>
              <ul>
                {["2+ properties", "Multi-property cockpit + alerts", "Dispute-ready PDF exports"].map((f) => (
                  <li key={f}>
                    <Check size={16} color="#60A5FA" w={2.4} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#join" className="btn" style={{ width: "100%", justifyContent: "center" }}>
                Get early access
              </a>
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
