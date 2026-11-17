import type { Metadata } from "next";
import Link from "next/link";
import { GuidesFrame } from "@/components/marketing/GuidesFrame";
import styles from "@/components/marketing/guides.module.css";
import { formatLongDate, getAllGuides, sectionAnchor } from "@/lib/guides";
import { marketingMetadata } from "@/lib/marketing-seo";

export const metadata: Metadata = marketingMetadata({
  title: "Hot tub help for rental hosts and techs | TrackTub",
  description:
    "Evergreen reference for rental hot tubs: the between-guest turnover routine, water chemistry targets, when to drain, what to do when a guest complains, and what to record on every visit.",
  pathname: "/guides",
});

export default function GuidesHubPage() {
  const guides = getAllGuides();
  const sections = [...new Set(guides.map((g) => g.section))];

  return (
    <GuidesFrame>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <ol>
          <li aria-current="page">Guides</li>
        </ol>
      </nav>
      <div className={styles.hubHead}>
        <span className={styles.eyebrow}>Guides</span>
        <h1>Hot tub help for rental hosts and techs</h1>
        <p>
          Reference guides for keeping a rental hot tub guest-ready, kept up to
          date in place. Written by a working hot tub tech who services rental
          tubs.
        </p>
      </div>
      {sections.map((section) => (
        <section
          key={section}
          id={sectionAnchor(section)}
          className={styles.section}
        >
          <h2>{section}</h2>
          <ul className={styles.cards}>
            {guides
              .filter((g) => g.section === section)
              .map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className={styles.card}>
                    <h3>{g.title}</h3>
                    <p>{g.description}</p>
                    <span className={styles.cardMeta}>
                      Last reviewed {formatLongDate(g.lastReviewed)}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </GuidesFrame>
  );
}
