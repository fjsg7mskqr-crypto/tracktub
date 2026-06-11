import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { getURL } from "@/lib/url";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: "TrackTub — guest-ready hot tub proof",
  description:
    "Dispute-grade turnover proof for short-term-rental operators. Capture, prove, share.",
  openGraph: {
    title: "TrackTub — guest-ready hot tub proof",
    description:
      "The dispute-grade evidence layer for short-term-rental hot-tub turnovers.",
    siteName: "TrackTub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackTub — guest-ready hot tub proof",
    description:
      "The dispute-grade evidence layer for short-term-rental hot-tub turnovers.",
  },
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
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <body>
        <Shell>{children}</Shell>
        <Analytics />
      </body>
    </html>
  );
}
