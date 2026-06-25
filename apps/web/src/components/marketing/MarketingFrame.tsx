import Link from "next/link";
import { Lockup, Waterline } from "@/app/landing/_marks";

type Props = {
  children: React.ReactNode;
  /** Highlight the active nav item. */
  active?: "landing" | "blog";
};

/** Shared chrome for public marketing pages (`/landing`, `/blog`). */
export function MarketingFrame({ children, active }: Props) {
  return (
    <div className="wrap">
      <div className="nav">
        <Link href="/landing" className="brandlink">
          <Lockup className="brandlockup" />
        </Link>
        <div className="navlinks">
          <a href="/landing#why">Why it matters</a>
          <a href="/landing#how">How it works</a>
          <Link href="/blog" className={active === "blog" ? "active" : undefined}>
            Resources
          </Link>
          <a href="/landing#pricing">Pricing</a>
          <a href="/landing#faq">FAQ</a>
        </div>
        <div className="sp">
          <a href="/landing#join" className="btn sm">
            Get early access
          </a>
        </div>
      </div>

      {children}

      <footer>
        <Link href="/landing" className="brandlink">
          <Lockup className="flock" />
        </Link>
        <div className="fwater">
          <Waterline strokeWidth={1.4} />
        </div>
        <div className="fcopy">© 2026 TrackTub</div>
        <Link href="/blog" className="flink">
          Resources
        </Link>
        <a className="fx" href="https://x.com/tracktub" target="_blank" rel="noopener noreferrer" aria-label="TrackTub on X">
          <svg viewBox="0 0 24 24" width="15" height="15">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
