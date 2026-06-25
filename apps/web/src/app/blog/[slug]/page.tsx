import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/marketing/MarkdownBody";
import { MarketingFrame } from "@/components/marketing/MarketingFrame";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { absoluteUrl, articleMetadata } from "@/lib/marketing-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return articleMetadata(post);
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@type": "Organization", name: post.author ?? "TrackTub Team" },
    publisher: {
      "@type": "Organization",
      name: "TrackTub",
      logo: { "@type": "ImageObject", url: absoluteUrl("/og-card.svg") },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <MarketingFrame active="blog">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="barticle">
        <Link href="/blog" className="bback">
          ← All resources
        </Link>
        <span className="eyebrow">{post.pillar ?? "Guide"}</span>
        <h1>{post.title}</h1>
        <div className="meta">
          <time dateTime={post.publishedAt}>
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span>{post.author ?? "TrackTub Team"}</span>
        </div>
        <MarkdownBody content={post.content} />
        <div className="glass bcta">
          <h2>Turn your turnover photos into proof</h2>
          <p>
            TrackTub stamps each guided capture on a trusted clock, locks the record, and gives you
            a share link when an owner or guest asks.
          </p>
          <a href="/landing#join" className="btn">
            Get early access
          </a>
        </div>
      </article>
    </MarketingFrame>
  );
}
