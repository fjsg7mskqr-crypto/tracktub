import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { marketingMetadata } from "@/lib/marketing-seo";
import { LandingWaitlist } from "./LandingWaitlist";
import { Faq } from "./Faq";
import { BARS, FAQS, GROUPS, PHONES, ROWS, SHOTS } from "./content";
import styles from "./landing.module.css";

// MUST stay dynamic — see the note in src/app/login/layout.tsx (#41, #271, #281).
// The enforcing CSP is nonce-based with 'strict-dynamic', so a prerendered page
// is served as frozen, nonce-less HTML and every script on it is blocked. On
// this page that killed the waitlist form (tests/csp-nonce-coverage.test.ts
// guards it). Do not remove.
export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Photos and a water test from every turnover, in one link. Hot tub turnover reports for Airbnb and vacation rental hosts. Free for your first property.";

export const metadata: Metadata = marketingMetadata({
  title: "Hot tub turnover reports for short-term rentals | TrackTub",
  description: DESCRIPTION,
  pathname: "/",
});

const COVER = "/landing/report-cover-on.jpg";

/** A next/image that fills a positioned, rounded box. */
function Photo({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`${styles.photo} ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={styles.photoImg}
      />
    </span>
  );
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      Track<span className={styles.blue}>Tub</span>
    </span>
  );
}

function Swatches() {
  return (
    <span className={styles.swatches} aria-hidden="true">
      <span style={{ background: "#1f8f96" }} />
      <span style={{ background: "#f2b52f" }} />
      <span style={{ background: "#6d8bd6" }} />
      <span style={{ background: "#8a4fbf" }} />
    </span>
  );
}

const JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrackTub",
    applicationCategory: "BusinessApplication",
    description: DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function Landing() {
  return (
    <div className={styles.root}>
      {JSON_LD.map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}

      <header className={styles.header}>
        <Wordmark className={styles.logo} />
        <nav className={styles.nav} aria-label="Main">
          <a className={styles.navA} href="#b-app">
            The app
          </a>
          <a className={styles.navA} href="#b-report">
            The report
          </a>
          <Link className={styles.navA} href="/guides">
            Guides
          </Link>
          <a className={styles.navA} href="#b-faq">
            Questions
          </a>
          <a className={styles.navCta} href="#b-join">
            Get early access
          </a>
        </nav>
      </header>

      <main>
        {/* Hero: text left, the owner's report on a phone over the tub photo */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.heroText}>
            <Swatches />
            <h1 className={styles.h1}>Know the tub was ready</h1>
            <p className={styles.lede}>
              Photos and a water test from every turnover, in one link. For
              Airbnb and vacation rental hot tubs.
            </p>
            <div className={styles.row}>
              <a href="#b-join" className={styles.btnPrimary}>
                Get early access
              </a>
              <a href="#b-report" className={styles.btnSecondary}>
                See a report
              </a>
            </div>
            <p className={styles.fine}>
              Free for your first property. Join the early access list.
            </p>
          </div>
          <div className={styles.heroArt}>
            <Photo
              src="/landing/hero-cabin.jpg"
              alt="A vacation rental cabin"
              sizes="(max-width: 900px) 80vw, 480px"
              className={styles.heroPhoto}
              priority
            />
            <div className={`${styles.heroCard} ${styles.fCard}`}>
              <div className={styles.heroCardInner}>
                <div className={styles.between}>
                  <Wordmark className={styles.cardMark} />
                  <span className={styles.badge}>Ready</span>
                </div>
                <span className={styles.cardEyebrow}>Example report</span>
                <span className={styles.cardTitle}>Pine Chalet hot tub</span>
                <span className={styles.cardMeta}>
                  Fri, Nov 14 · finished 2:14 PM
                </span>
                <div className={styles.thumbs}>
                  <Photo
                    src="/landing/hero-report-before.jpg"
                    alt=""
                    sizes="80px"
                    className={styles.thumb8}
                  />
                  <Photo
                    src="/landing/clear-water.jpg"
                    alt=""
                    sizes="80px"
                    className={styles.thumb8}
                  />
                  <Photo
                    src={COVER}
                    alt=""
                    sizes="80px"
                    className={styles.thumb8}
                  />
                </div>
                <dl className={styles.cardReadings}>
                  <div>
                    <dt>pH</dt>
                    <dd>7.4</dd>
                  </div>
                  <div>
                    <dt>Chlorine</dt>
                    <dd>4.0 ppm</dd>
                  </div>
                  <div>
                    <dt>Alkalinity</dt>
                    <dd>90 ppm</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Turnover clock: the real window between guests */}
        <section
          aria-label="A turnover day"
          className={`${styles.wrap} ${styles.clockSec}`}
        >
          <div
            className={styles.clockBand}
            role="region"
            aria-label="A turnover day, scrolls sideways on small screens"
            tabIndex={0}
          >
            <div className={styles.clock}>
              <div className={styles.clockEnd}>
                <span className={styles.clockTime}>11:00</span>
                <span className={styles.clockLabel}>Guests check out</span>
              </div>
              <div className={styles.track}>
                <div className={styles.trackLine} />
                <div className={styles.dotL} />
                <div className={styles.dotR} />
                <div className={styles.techBar} />
                <div className={styles.techLabel}>Your tech, 1:52 to 2:14</div>
                <div className={styles.openDot} />
                <div className={styles.openLabel}>
                  2:31 · You open the report
                </div>
              </div>
              <div className={`${styles.clockEnd} ${styles.right}`}>
                <span className={styles.clockTime}>4:00</span>
                <span className={styles.clockLabel}>Next guests arrive</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.stakes}`}>
          <p className={styles.stakesText}>
            Guests notice the hot tub first.{" "}
            <span className={styles.mute}>
              Refunds can come out of your payout.
            </span>
          </p>
        </section>

        {/* Three steps: a real sequence, so numbered */}
        <section className={`${styles.wrap} ${styles.steps}`}>
          <h2 className={styles.h2}>Checkout to check-in</h2>
          <div className={styles.stepGrid}>
            <div className={styles.step}>
              <div className={`${styles.stepArt} ${styles.stepArt1}`}>
                <div className={styles.miniPhone}>
                  <Photo
                    src="/landing/screen-visit.png"
                    alt="TrackTub visit screen with the photo steps"
                    sizes="190px"
                    className={`${styles.miniScreen} ${styles.top}`}
                  />
                </div>
                <div className={styles.chips}>
                  <span className={styles.chip}>✓ Before photo</span>
                  <span className={styles.chip}>✓ Water test</span>
                  <span className={styles.chip}>✓ After photos</span>
                  <span className={`${styles.chip} ${styles.mute}`}>
                    Finish visit
                  </span>
                </div>
              </div>
              <span
                className={styles.num}
                style={{ background: "#1f8f96", color: "#fff" }}
              >
                1
              </span>
              <h3 className={styles.h3}>Tech visits</h3>
              <p className={styles.stepP}>
                Before and after photos, then the water test. The app walks them
                through it.
              </p>
            </div>

            <div className={styles.step}>
              <div className={`${styles.stepArt} ${styles.stepArt2}`}>
                <div className={styles.msg}>
                  <span className={styles.avatar}>A</span>
                  <span className={styles.msgText}>
                    <span className={styles.msgName}>Alex (hot tub tech)</span>
                    <span className={styles.msgBody}>
                      Pine Chalet is ready. Here’s the report.
                    </span>
                  </span>
                  <span className={styles.msgTime}>2:14 PM</span>
                </div>
                <div className={styles.miniReport}>
                  <div className={styles.between}>
                    <span className={styles.miniMark}>
                      Track<span className={styles.blue}>Tub</span> report
                    </span>
                    <span className={`${styles.badge} ${styles.badgeSm}`}>
                      Ready
                    </span>
                  </div>
                  <span className={styles.miniTitle}>Pine Chalet hot tub</span>
                  <div className={styles.thumbs}>
                    <Photo
                      src="/landing/report-before.jpg"
                      alt=""
                      sizes="80px"
                      className={styles.thumb7}
                    />
                    <Photo
                      src="/landing/report-after.jpg"
                      alt=""
                      sizes="80px"
                      className={styles.thumb7}
                    />
                    <Photo
                      src={COVER}
                      alt=""
                      sizes="80px"
                      className={styles.thumb7}
                    />
                  </div>
                  <span className={styles.cardMeta}>
                    Fri 2:14 PM · water in range
                  </span>
                </div>
              </div>
              <span
                className={styles.num}
                style={{ background: "#f2b52f", color: "#3b2a00" }}
              >
                2
              </span>
              <h3 className={styles.h3}>You get a link</h3>
              <p className={styles.stepP}>
                Your tech shares the link when the visit is finished. Forward it
                to the owner.
              </p>
            </div>

            <div className={styles.step}>
              <div className={`${styles.stepArt} ${styles.stepArt3}`}>
                <span className={styles.chatFrom}>Guest · Airbnb message</span>
                <div className={styles.bubbleIn}>
                  The hot tub was cloudy when we arrived. Can we get a refund?
                </div>
                <div className={styles.bubbleOut}>
                  <div className={styles.proofPhoto}>
                    <Photo
                      src="/landing/clear-water.jpg"
                      alt="Clear water at the turnover"
                      sizes="260px"
                      className={styles.fillBox}
                    />
                    <span className={styles.proofTime}>
                      Fri 2:11 PM · After
                    </span>
                    <div className={styles.proofReadings}>
                      <span className={styles.pill}>pH 7.4</span>
                      <span className={styles.pill}>Cl 4.0</span>
                      <span className={`${styles.pill} ${styles.pillOk}`}>
                        Locked
                      </span>
                    </div>
                  </div>
                  <span className={styles.proofNote}>
                    Photo and water test at 2:11 PM on your check-in day.
                  </span>
                </div>
              </div>
              <span
                className={styles.num}
                style={{ background: "#8a4fbf", color: "#fff" }}
              >
                3
              </span>
              <h3 className={styles.h3}>Proof, if you need it</h3>
              <p className={styles.stepP}>
                A guest complains? Send them the report, or include it with your
                reply to Airbnb support.
              </p>
            </div>
          </div>
        </section>

        <section id="b-app" className={styles.appSec}>
          <div className={`${styles.wrap} ${styles.center}`}>
            <h2 className={styles.h2Big}>One step at a time</h2>
            <p className={styles.sub}>
              Real screens from the app your tech uses at the tub.
            </p>
          </div>
          <div
            className={styles.phones}
            tabIndex={0}
            role="region"
            aria-label="App screens, scroll sideways"
          >
            {PHONES.map((p) => (
              <figure
                key={p.src}
                className={styles.phoneFig}
                style={p.offset ? { marginTop: 56 } : undefined}
              >
                <div className={styles.phone}>
                  <Photo
                    src={p.src}
                    alt={p.alt}
                    sizes="230px"
                    className={`${styles.phoneScreen} ${styles.top}`}
                  />
                </div>
                <figcaption className={styles.cap}>
                  <span className={styles.capT}>{p.title}</span>
                  <span className={styles.capS}>{p.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Anatomy of a report */}
        <section id="b-report" className={styles.reportSec}>
          <div className={`${styles.wrap} ${styles.reportInner}`}>
            <div className={styles.reportHead}>
              <h2 className={styles.h2Big}>One link. The whole visit</h2>
              <p className={styles.reportSub}>
                The owner opens it on any phone. No app, no login. This example
                uses photos from real visits.
              </p>
            </div>
            <div className={styles.reportBody}>
              <div className={styles.report}>
                <div className={styles.between}>
                  <span className={styles.reportBrand}>
                    <Swatches />
                    <span className={styles.reportBrandT}>Example report</span>
                  </span>
                  <span className={styles.lockedTag}>Locked</span>
                </div>
                <div className={styles.reportTitleBlock}>
                  <span className={styles.reportTitle}>
                    Pine Chalet hot tub
                  </span>
                  <span className={styles.reportMeta}>
                    Fri, Nov 14 · 1:52 to 2:14 PM · Alex R.
                  </span>
                </div>
                <div className={styles.shots}>
                  {SHOTS.map((s) => (
                    <div key={s.label} className={styles.shot}>
                      <Photo
                        src={s.src}
                        alt={s.label}
                        sizes="(max-width: 520px) 28vw, 140px"
                        className={styles.shotImg}
                      />
                      <span className={styles.shotLabel}>{s.label}</span>
                      <span className={`${styles.mono} ${styles.shotTime}`}>
                        {s.time}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className={styles.table}
                  role="table"
                  aria-label="Water readings"
                >
                  <div className={`${styles.tr} ${styles.th}`} role="row">
                    <span role="columnheader">Water</span>
                    <span role="columnheader">As found</span>
                    <span role="columnheader">As left</span>
                    <span role="columnheader">Target</span>
                  </div>
                  {ROWS.map((r) => (
                    <div
                      key={r.label}
                      className={`${styles.tr} ${styles.td}`}
                      role="row"
                    >
                      <span className={styles.rowLabel} role="cell">
                        <span
                          className={styles.sw}
                          style={{ background: r.sw }}
                        />
                        {r.label}
                      </span>
                      <span
                        role="cell"
                        style={{
                          color: r.off ? "#b45309" : "#111827",
                          fontWeight: r.off ? 700 : 400,
                        }}
                      >
                        {r.found}
                      </span>
                      <span role="cell" className={styles.strong}>
                        {r.left}
                      </span>
                      <span role="cell" className={styles.mute}>
                        {r.target}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.note}>
                  <span className={styles.noteH}>Added</span>
                  <span>Alkalinity up · 3 oz</span>
                  <span>Chlorine granules · 2 tsp</span>
                </div>
                <div className={styles.note}>
                  <span className={styles.noteH}>Left for next visit</span>
                  <span>Filter due in 9 days</span>
                </div>
              </div>

              <div className={styles.record}>
                <h3 className={styles.h3}>What’s on the record</h3>
                <div className={styles.groups}>
                  {GROUPS.map((g) => (
                    <div key={g.title} className={styles.group}>
                      <h4 className={styles.h4}>{g.title}</h4>
                      <ul className={styles.list}>
                        {g.items.map((it) => (
                          <li key={it.k}>
                            <strong>{it.k}</strong> {it.v}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.chart}>
              <div className={styles.chartHead}>
                <h3 className={styles.h3}>Water at Pine Chalet, Nov 14</h3>
                <div className={styles.legend}>
                  <span>
                    <span className={styles.lgFound} />
                    As found
                  </span>
                  <span>
                    <span className={styles.lgLeft} />
                    As left
                  </span>
                  <span>
                    <Swatches />
                    Target range
                  </span>
                </div>
              </div>
              {BARS.map((b) => (
                <div key={b.label} className={styles.barRow}>
                  <span className={styles.bL}>{b.label}</span>
                  <div className={styles.bT}>
                    <div className={styles.bLine} />
                    <div
                      className={styles.bBand}
                      style={{
                        left: `${b.lo}%`,
                        width: `${b.w}%`,
                        background: b.band,
                      }}
                    />
                    <span
                      title="As found"
                      className={styles.bFound}
                      style={{ left: `calc(${b.found}% - 8px)` }}
                    />
                    <span
                      title="As left"
                      className={styles.bLeft}
                      style={{
                        left: `calc(${b.left}% - 8px)`,
                        background: b.dot,
                      }}
                    />
                  </div>
                  <span className={`${styles.bV} ${styles.mono}`}>
                    {b.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="b-faq" className={styles.faqSec}>
          <h2 className={styles.h2}>Questions hosts ask</h2>
          <Faq />
        </section>
      </main>

      <section id="b-join" className={styles.join}>
        <div className={`${styles.wrap} ${styles.joinInner}`}>
          <div className={styles.joinCopy}>
            <h2 className={styles.h2Join}>Stop wondering</h2>
            <p className={styles.joinP}>
              Join the early access list. We’ll email you when it’s your turn.
              Free for your first property.
            </p>
            <p className={styles.joinSmall}>
              Built by a working hot tub tech who services short-term rental
              tubs.
            </p>
          </div>
          <LandingWaitlist />
        </div>
        <footer className={`${styles.wrap} ${styles.footer}`}>
          <Wordmark className={styles.footMark} />
          <nav className={styles.footNav} aria-label="Footer">
            <Link href="/guides">Guides</Link>
            <a href="https://x.com/tracktub">@tracktub on X</a>
            <a href="/privacy">Privacy</a>
            <a href="mailto:tracktubapp@gmail.com">Contact</a>
          </nav>
          <span>Hot tub turnover reports for short-term rentals.</span>
        </footer>
      </section>
    </div>
  );
}
