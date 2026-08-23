import type { Metadata } from "next";

// The login screen must never be indexed — it's the app's front door, not
// marketing. robots.txt disallows it and middleware gates the app, but a
// per-page noindex is the belt-and-suspenders signal search engines honor even
// if the page is linked from somewhere unexpected.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// MUST stay dynamic. The enforcing CSP uses a per-request nonce with
// 'strict-dynamic' (issue #41), so a browser runs ONLY scripts carrying that
// request's nonce. Next injects the nonce while *rendering*, so a statically
// prerendered /login is served as frozen, nonce-less HTML while the response
// header still carries a fresh nonce — nothing matches, every script is blocked,
// the page never hydrates, and "Continue with Google" silently does nothing
// (its onClick is never bound). This was live on prod.
//
// Correction (#281): /login was NOT the only user-facing prerendered route, as
// this note originally claimed. /landing and /blog were prerendered too and had
// the same dead-JS failure — it just wasn't noticed, because unlike sign-in
// those pages still *look* fine without JS. They are now force-dynamic as well,
// and tests/csp-nonce-coverage.test.ts fails the build if any scripted route
// goes back to being prerendered.
export const dynamic = "force-dynamic";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
