import Link from "next/link";
import styles from "./guides.module.css";

/** Light, Round 6-style chrome for the public `/guides` pages. */
export function GuidesFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Track<span className={styles.blue}>Tub</span>
        </Link>
        <nav className={styles.nav} aria-label="Main">
          <Link href="/guides" className={styles.navA}>
            Guides
          </Link>
          <Link href="/" className={styles.navCta}>
            Get early access
          </Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>
          Track<span className={styles.blue}>Tub</span>
        </Link>
        <nav className={styles.footNav} aria-label="Footer">
          <Link href="/guides">Guides</Link>
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </div>
  );
}
