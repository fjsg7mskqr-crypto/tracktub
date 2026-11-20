import type { Metadata } from "next";
import Link from "next/link";
import { GuidesFrame } from "@/components/marketing/GuidesFrame";
import styles from "@/components/marketing/guides.module.css";
import { marketingMetadata } from "@/lib/marketing-seo";
import { PRIVACY_OPERATOR, PRIVACY_UPDATED } from "@/lib/privacy";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy Policy | TrackTub",
  description:
    "How TrackTub collects, uses, and shares information when you visit the site, join the waitlist, use the app, or open a shared report.",
  pathname: "/privacy",
});

export default function PrivacyPage() {
  return (
    <GuidesFrame>
      <article className={styles.article}>
        <span className={styles.eyebrow}>Legal</span>
        <h1>Privacy Policy</h1>
        <div className={styles.meta}>
          <time dateTime={PRIVACY_UPDATED}>Last updated November 16, 2026</time>
        </div>
        <div className={styles.prose}>
          <p>
            {PRIVACY_OPERATOR} This policy explains what information we handle
            when you visit our site, join the waitlist, use the app, or open a
            shared report.
          </p>
          <p>
            TrackTub is built for property managers and hot tub technicians.
            Accounts belong to those professionals and their teams. Property
            owners and rental hosts do not need an account: they receive reports
            as a link.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Waitlist:</strong> your email address, the signup source,
              and signup time.
            </li>
            <li>
              <strong>Accounts and teams:</strong> information from Google
              sign-in and Supabase Auth, including your email, name, account ID,
              session information, workspace membership, roles, and invitation
              details.
            </li>
            <li>
              <strong>Service records:</strong> client or owner names and
              contact emails; property names, addresses, and tub notes; visit
              photos, times, water readings, treatments, notes, issues, and the
              identity of the person recording them. Older records may also
              contain property or capture coordinates.
            </li>
            <li>
              <strong>Usage and security:</strong> page views, app events,
              shared report opens, error reports, and technical information
              needed to run and protect the service. When rate limiting is
              configured, an IP address is used as its temporary key.
            </li>
          </ul>

          <h2>Photos</h2>
          <p>
            Photos are taken with the phone camera inside the app. Before a
            photo leaves your device, the app re-encodes it as a new JPEG, which
            removes EXIF metadata including embedded location. The app never
            uploads an unprocessed photo: if it cannot process one, it asks you
            to retake it and uploads nothing, and the server refuses any file
            that is not a re-encoded JPEG.
          </p>

          <h2>How we use it</h2>
          <p>
            We use this information to contact waitlist subscribers about early
            access, sign users in, manage workspaces and invitations, create and
            display turnover records, show shared reports, measure use, fix
            errors, and prevent abuse. We do not sell your personal information.
          </p>

          <h2>Who processes it</h2>
          <p>
            Supabase provides authentication, database, and photo storage;
            Google handles Google sign-in; Vercel hosts the site and provides
            Web Analytics and BotID; PostHog handles product analytics when
            configured; Sentry receives error and performance data; and Upstash
            handles IP-based rate limiting when configured. These providers
            process information to help us operate the service.
          </p>

          <h2>Cookies and analytics</h2>
          <p>
            Supabase uses cookies for sign-in sessions and the Google sign-in
            flow. PostHog may use browser storage or cookies for analytics when
            enabled; its configuration disables autocapture and session
            recording. Vercel Web Analytics measures site visits. Sentry
            collects errors and sampled performance data; its error replay masks
            text and blocks media. BotID checks public submissions for automated
            abuse. Your browser settings can limit cookies, but doing so may
            prevent sign-in.
          </p>

          <h2>Shared reports and photos</h2>
          <p>
            Anyone with a report link can open it without an account. The report
            loads only when the link&apos;s exact token matches, and it shows
            the property name and address, the client name, the name of the
            person who recorded the visit (or their email if they have no name),
            photos, water readings, cleaning steps, and notes. When a person
            loads a report in their browser, we record that the link was opened
            and when, without storing the viewer&apos;s IP address in the
            report-open records. Link previews and automated scanners, and opens
            by signed-in members of the team that made the report, are not
            counted. An open means the link was loaded, not that anyone read the
            report.
          </p>
          <p>
            Photos are stored in a private Supabase Storage bucket. They open
            only through links that expire (about an hour): signed-in team
            members see them in the app, and a shared report shows them through
            links created when the report is opened. A photo address copied out
            of a report stops working once its link expires. Please still share
            report links carefully, since anyone with a report link can open the
            report while it is shared.
          </p>

          <h2>Retention and your choices</h2>
          <p>
            We have not set a general deletion schedule in the app. Records and
            account information may remain until deleted or until the service
            ends. Write to{" "}
            <a href="mailto:tracktubapp@gmail.com">tracktubapp@gmail.com</a> to
            request access to or deletion of your information. We will review
            your request and explain if we need to keep any information for
            legal, security, or recordkeeping reasons.
          </p>

          <h2>Children and changes</h2>
          <p>
            TrackTub is for business users and is not intended for anyone under
            18. We may update this policy as the service changes. We will post
            the revised policy here with a new date.
          </p>

          <h2>Contact</h2>
          <p>
            Questions or privacy requests:{" "}
            <a href="mailto:tracktubapp@gmail.com">tracktubapp@gmail.com</a>.
          </p>
          <p>
            <Link href="/guides">Guides</Link>
          </p>
        </div>
      </article>
    </GuidesFrame>
  );
}
