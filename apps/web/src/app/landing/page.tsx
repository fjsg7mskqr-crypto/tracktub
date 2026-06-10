import type { Metadata } from "next";
import Link from "next/link";
import "./landing.css";
import { Lockup, Mark, Waterline } from "./_marks";
import { LandingWaitlist } from "./LandingWaitlist";

export const metadata: Metadata = {
  title: "TrackTub — guest-ready hot tub proof for every turnover",
  description:
    "The dispute-grade evidence layer for short-term-rental hot-tub turnovers. Your cleaners capture it; you prove it; owners and guests trust it.",
};

const PLATES = [
  { src: "/landing/full.jpg", label: "Full frame" },
  { src: "/landing/water.jpg", label: "Water level/clarity" },
  { src: "/landing/panel.jpg", label: "Control panel" },
  { src: "/landing/cover.jpg", label: "Cover" },
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
      <div className="wrap">
        {/* NAV */}
        <div className="nav glass">
          <Lockup className="brandlockup" />
          <div className="navlinks">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#proof">The proof</a>
          </div>
          <div className="sp">
            <Link href="/login" className="btn ghost sm">
              Sign in
            </Link>
            <a href="#join" className="btn sm">
              Join the waitlist
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
              The evidence layer for STR turnovers
            </span>
            <h1 style={{ marginTop: 18 }}>
              Guest-ready hot <span className="tub">tub</span> proof for every turnover.
            </h1>
            <p className="sub">
              Your cleaners shoot a guided four-photo set. TrackTub stamps it server-side, locks it, and turns it
              into a tamper-proof link owners and guests actually trust.
            </p>
            <LandingWaitlist />
            <div className="trust">
              <span className="vchip">
                <Check color="#34D399" w={3} />
                Verified, human-confirmed
              </span>
              <span>Free for 1 property · ~$12/property at 2+</span>
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

        {/* FEATURE SHOWCASE */}
        <div className="section" id="how">
          <span className="eyebrow">What&rsquo;s in the record</span>
          <div className="sechead">
            <h2>Everything that rides along with every turnover</h2>
            <p>Six things that turn four photos into a record that holds up in a dispute.</p>
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
              <p>Full frame, water level, control panel, cover — the same set every clean, in under ten minutes.</p>
              <div className="ui">
                <div className="uigrid">
                  {["Full frame", "Water level", "Control panel", "Cover"].map((l) => (
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

        {/* PRICING */}
        <div className="section" id="pricing">
          <span className="eyebrow">Simple pricing</span>
          <div className="sechead">
            <h2>Start free. Scale by the property.</h2>
          </div>
          <div className="price">
            <div className="glass pcard">
              <div className="k">Free</div>
              <div className="v">$0</div>
              <div className="d">For your first property — all features.</div>
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
                Join the waitlist
              </a>
            </div>
          </div>
        </div>

        {/* LAUNCH / CTA */}
        <div className="glass cta" id="join">
          <Mark className="markbig" />
          <span className="eyebrow" style={{ display: "block", marginBottom: 9 }}>
            Launching soon · building in public
          </span>
          <h2>Get proof on every turnover — from day one.</h2>
          <p>
            We&rsquo;re onboarding operators in small batches and shipping in the open. Join the waitlist, then follow
            the build on X.
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
