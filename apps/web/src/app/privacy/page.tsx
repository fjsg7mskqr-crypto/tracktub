// <!-- Draft — not legal advice; have counsel review before launch. -->
import type { Metadata } from "next";
import "../landing/landing.css";
import "../blog/blog.css";
import { MarketingFrame } from "@/components/marketing/MarketingFrame";
import { marketingMetadata } from "@/lib/marketing-seo";

// The nonce-based CSP requires request rendering, as on /blog.
export const dynamic = "force-dynamic";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy Policy — TrackTub",
  description: "How TrackTub collects, uses, and shares information.",
  pathname: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="tt-landing tt-blog">
      <MarketingFrame>
        <article className="barticle">
          <span className="eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <div className="meta">
            <time dateTime="2026-11-14">Last updated November 14, 2026</time>
          </div>
          <div className="bprose">
            <p>
              TrackTub is an early access service operated by [LEGAL ENTITY
              NAME]. This policy explains what information we handle when you
              visit our site, join the waitlist, use the app, or open a shared
              report.
            </p>

            <h2>Information we collect</h2>
            <ul>
              <li>
                <strong>Waitlist:</strong> your email address, the signup
                source, and signup time.
              </li>
              <li>
                <strong>Accounts and teams:</strong> information from Google
                sign-in and Supabase Auth, including your email, name, account
                ID, session information, workspace membership, roles, and
                invitation details.
              </li>
              <li>
                <strong>Service records:</strong> client or owner names and
                contact emails; property names, addresses, and tub notes; visit
                photos, times, water readings, treatments, notes, issues, and
                the identity of the person recording them. Older records may
                also contain property or capture coordinates.
              </li>
              <li>
                <strong>Usage and security:</strong> page views, app events,
                shared report opens, error reports, and technical information
                needed to run and protect the service. When rate limiting is
                configured, an IP address is used as its temporary key.
              </li>
            </ul>
            <p>
              The current camera flow re-encodes photos to remove EXIF metadata,
              including embedded location, before upload when the browser can
              process the image. If processing fails, it may upload the original
              file.
            </p>

            <h2>How we use it</h2>
            <p>
              We use this information to contact waitlist subscribers about
              early access, sign users in, manage workspaces and invitations,
              create and display turnover records, show shared reports, measure
              use, fix errors, and prevent abuse. We do not sell your personal
              information.
            </p>

            <h2>Who processes it</h2>
            <p>
              Supabase provides authentication, database, and photo storage;
              Google handles Google sign-in; Vercel hosts the site and provides
              Web Analytics and BotID; PostHog handles product analytics when
              configured; Sentry receives error and performance data; and
              Upstash handles IP-based rate limiting when configured. These
              providers process information to help us operate the service.
            </p>

            <h2>Cookies and analytics</h2>
            <p>
              Supabase uses cookies for sign-in sessions and the Google sign-in
              flow. PostHog may use browser storage or cookies for analytics
              when enabled; its configuration disables input autocapture and
              routine session recording. Vercel Web Analytics measures site
              visits. Sentry collects errors and sampled performance data; its
              error replay masks text and blocks media. BotID checks public
              submissions for automated abuse. Your browser settings can limit
              cookies, but doing so may prevent sign-in.
            </p>

            <h2>Shared reports and photos</h2>
            <p>
              Anyone with a report link can open it without an account and see
              the information shown there, including photos and relevant
              property and service details. We record that a link was opened and
              when, without storing the viewer&apos;s IP address in the
              report-open records. Photos currently use a public Supabase
              Storage bucket: anyone who has an individual photo URL can view
              that photo. Please share report and photo links carefully.
            </p>

            <h2>Retention and your choices</h2>
            <p>
              We have not set a general deletion schedule in the app. Records
              and account information may remain until deleted or until the
              service ends. Write to{" "}
              <a href="mailto:tracktubapp@gmail.com">tracktubapp@gmail.com</a>{" "}
              to request access to or deletion of your information. We will
              review your request and explain if we need to keep any information
              for legal, security, or recordkeeping reasons.
            </p>

            <h2>Children and changes</h2>
            <p>
              TrackTub is for business users and is not intended for anyone
              under 18. We may update this policy as the service changes. We
              will post the revised policy here with a new date.
            </p>

            <h2>Contact</h2>
            <p>
              Questions or privacy requests:{" "}
              <a href="mailto:tracktubapp@gmail.com">tracktubapp@gmail.com</a>.
            </p>
          </div>
        </article>
      </MarketingFrame>
    </div>
  );
}
