import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./app-tokens.css";
import { Shell } from "@/components/Shell";
import { Analytics } from "@/components/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { getURL } from "@/lib/url";

// Self-hosted (Fontsource variable builds, latin, OFL — see ./fonts) so the
// build never fetches from Google Fonts; that fetch flaked CI and blocked a
// release.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const jbMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jbmono",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-space",
  display: "swap",
});
// Signed-in app only — applied via `.tt-app` (app-tokens.css), so /landing and
// /blog keep their own type.
const archivo = localFont({
  src: "./fonts/archivo-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: "TrackTub — guest-ready hot tub proof",
  description:
    "Timestamped hot-tub turnover records for short-term rentals. Capture, keep, share.",
  openGraph: {
    title: "TrackTub — guest-ready hot tub proof",
    description:
      "Timestamped, locked records of every short-term-rental hot-tub turnover.",
    siteName: "TrackTub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackTub — guest-ready hot tub proof",
    description:
      "Timestamped, locked records of every short-term-rental hot-tub turnover.",
  },
  // Google Search Console domain verification. No-op until the env var is set in
  // Vercel (then redeploy — NEXT_PUBLIC_* is inlined at build time). Lets the
  // founder verify ownership and submit the sitemap.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#08090A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jbMono.variable} ${spaceGrotesk.variable} ${archivo.variable}`}
    >
      <body>
        <Analytics />
        <Shell>{children}</Shell>
        <VercelAnalytics />
      </body>
    </html>
  );
}
