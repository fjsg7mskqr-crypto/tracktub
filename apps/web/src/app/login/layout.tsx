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
// (its onClick is never bound). This was live on prod: /login was the only
// user-facing statically prerendered route, so it was the only dead one.
export const dynamic = "force-dynamic";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
