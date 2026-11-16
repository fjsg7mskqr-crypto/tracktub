// <!-- Draft — not legal advice; have counsel review before launch. -->
import type { Metadata } from "next";
import "../landing/landing.css";
import "../blog/blog.css";
import { MarketingFrame } from "@/components/marketing/MarketingFrame";
import { marketingMetadata } from "@/lib/marketing-seo";

// The nonce-based CSP requires request rendering, as on /blog.
export const dynamic = "force-dynamic";

export const metadata: Metadata = marketingMetadata({
  title: "Terms of Use — TrackTub",
  description: "Terms for using the TrackTub early access service.",
  pathname: "/terms",
});

export default function TermsPage() {
  return (
    <div className="tt-landing tt-blog">
      <MarketingFrame>
        <article className="barticle">
          <span className="eyebrow">Legal</span>
          <h1>Terms of Use</h1>
          <div className="meta">
            <time dateTime="2026-11-14">Last updated November 14, 2026</time>
          </div>
          <div className="bprose">
            <p>
              These terms govern your use of TrackTub, an early access service
              provided by [LEGAL ENTITY NAME]. By using the service, you agree
              to these terms. If you use it for a business, you confirm that you
              may accept these terms for that business.
            </p>

            <h2>Early access and accounts</h2>
            <p>
              TrackTub is still being developed. Features may change, be
              interrupted, or be withdrawn. Keep your sign-in credentials
              secure, provide accurate account information, and manage access
              for people you invite to your workspace. You are responsible for
              activity under your account and for your team&apos;s use of the
              service.
            </p>

            <h2>Acceptable use</h2>
            <p>
              Use TrackTub only for lawful business purposes. Do not upload
              material you lack rights to use, misrepresent a turnover record,
              interfere with the service, try to access another workspace, or
              use links or accounts to harass others. Do not put unnecessary
              sensitive personal information in photos or notes.
            </p>

            <h2>Your content</h2>
            <p>
              You keep ownership of the photos, readings, notes, and other
              content you provide. You grant [LEGAL ENTITY NAME] a nonexclusive
              license to store, process, reproduce, and display that content as
              needed to operate TrackTub and show records to people you
              authorize through the service. You are responsible for obtaining
              any permissions needed to collect and share it.
            </p>

            <h2>Shareable report links</h2>
            <p>
              A report link works for anyone who holds it; the viewer does not
              need to sign in. Only share links with people who should see the
              report. Individual photo URLs may also be accessible to anyone who
              has them. We cannot control what recipients do with content after
              they view or save it.
            </p>

            <h2>Water quality and evidence</h2>
            <p>
              TrackTub records information supplied by users. It does not test
              water itself, certify that water is safe, replace professional
              judgment or applicable health requirements, or guarantee any
              result in a guest, owner, platform, or insurance dispute. You
              remain responsible for water care, safety decisions, and the
              accuracy of records you submit.
            </p>

            <h2>Disclaimer and liability</h2>
            <p>
              The early access service is provided &ldquo;as is&rdquo; and
              &ldquo;as available,&rdquo; without warranties to the extent
              permitted by law. To the extent permitted by law, [LEGAL ENTITY
              NAME] will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or for lost profits or data
              arising from use of the service. To the extent permitted by law,
              our total liability for claims relating to the service is limited
              to [LIABILITY CAP].
            </p>

            <h2>Ending use and changes</h2>
            <p>
              You may stop using the service at any time and email us to request
              account or data deletion. We may suspend or end access for misuse,
              security reasons, or if we discontinue early access. We may change
              these terms as the service evolves. We will post revised terms
              here with a new date; continued use after changes take effect
              means you accept them.
            </p>

            <h2>Governing law and contact</h2>
            <p>
              These terms are governed by the law of [STATE / GOVERNING LAW],
              subject to applicable law. Questions:{" "}
              <a href="mailto:tracktubapp@gmail.com">tracktubapp@gmail.com</a>.
            </p>
          </div>
        </article>
      </MarketingFrame>
    </div>
  );
}
