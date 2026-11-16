import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuidesFrame } from "@/components/marketing/GuidesFrame";
import styles from "@/components/marketing/guides.module.css";
import { MarkdownBody } from "@/components/marketing/MarkdownBody";
import {
  formatLongDate,
  getGuideBySlug,
  getGuideSlugs,
  getRelatedGuides,
  GUIDES_BYLINE,
  GUIDES_BYLINE_NOTE,
  sectionAnchor,
} from "@/lib/guides";
import { absoluteUrl, guideMetadata, OG_IMAGE_PATH } from "@/lib/marketing-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  return guide ? guideMetadata(guide) : {};
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const url = absoluteUrl(`/guides/${guide.slug}`);
  const sectionUrl = absoluteUrl(`/guides#${sectionAnchor(guide.section)}`);
  const related = getRelatedGuides(guide);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.description,
      datePublished: guide.publishedAt,
      dateModified: guide.lastReviewed,
      url,
      mainEntityOfPage: url,
      image: absoluteUrl(OG_IMAGE_PATH),
      author: { "@type": "Organization", name: GUIDES_BYLINE },
      publisher: {
        "@type": "Organization",
        name: "TrackTub",
        logo: { "@type": "ImageObject", url: absoluteUrl(OG_IMAGE_PATH) },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Guides",
          item: absoluteUrl("/guides"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: guide.section,
          item: sectionUrl,
        },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];

  return (
    <GuidesFrame>
      {jsonLd.map((ld) => (
        <script
          key={ld["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      ))}
      <article className={styles.article}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/guides">Guides</Link>
            </li>
            <li>
              <Link href={`/guides#${sectionAnchor(guide.section)}`}>
                {guide.section}
              </Link>
            </li>
            <li aria-current="page">{guide.title}</li>
          </ol>
        </nav>
        <span className={styles.eyebrow}>{guide.section}</span>
        <h1>{guide.title}</h1>
        <div className={styles.meta}>
          <span>{GUIDES_BYLINE}</span>
          <span>
            Last reviewed{" "}
            <time dateTime={guide.lastReviewed}>
              {formatLongDate(guide.lastReviewed)}
            </time>
          </span>
        </div>
        <p className={styles.byline}>{GUIDES_BYLINE_NOTE}</p>
        <MarkdownBody content={guide.content} className={styles.prose} />
        <aside className={styles.doBox} aria-labelledby="do-every-visit">
          <h2 id="do-every-visit">Do this every visit</h2>
          <ul>
            {guide.record.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            TrackTub records this on every visit, and the owner gets a link.{" "}
            <Link href="/">See how it works</Link>
          </p>
        </aside>
        {related.length > 0 && (
          <nav className={styles.related} aria-labelledby="related-heading">
            <h2 id="related-heading">Related</h2>
            <ul>
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/guides/${r.slug}`}>{r.title}</Link>
                  <p>{r.description}</p>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </article>
    </GuidesFrame>
  );
}
