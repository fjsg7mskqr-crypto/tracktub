import type { Metadata } from "next";

// The login screen must never be indexed — it's the app's front door, not
// marketing. robots.txt disallows it and middleware gates the app, but a
// per-page noindex is the belt-and-suspenders signal search engines honor even
// if the page is linked from somewhere unexpected.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
