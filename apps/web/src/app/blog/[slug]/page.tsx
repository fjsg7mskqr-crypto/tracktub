import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/marketing/MarkdownBody";
import { MarketingFrame } from "@/components/marketing/MarketingFrame";
import { getPostBySlug, getPostSlugs, getRelatedPosts } from "@/lib/blog";
import {
  absoluteUrl,
  articleMetadata,
  OG_IMAGE_PATH,
} from "@/lib/marketing-seo";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

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

  const url = absoluteUrl(`/blog/${post.slug}`);
  const related = getRelatedPosts(post.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    url,
    image: absoluteUrl(OG_IMAGE_PATH),
    author: { "@type": "Organization", name: post.author ?? "TrackTub Team" },
    publisher: {
      "@type": "Organization",
      name: "TrackTub",
      logo: { "@type": "ImageObject", url: absoluteUrl(OG_IMAGE_PATH) },
    },
    mainEntityOfPage: url,
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
            {formatDate(post.publishedAt)}
          </time>
          {post.updatedAt && post.updatedAt !== post.publishedAt && (
            <span>
              Updated{" "}
              <time dateTime={post.updatedAt}>
                {formatDate(post.updatedAt)}
              </time>
            </span>
          )}
          <span>{post.author ?? "TrackTub Team"}</span>
        </div>
        <MarkdownBody content={post.content} />
        {related.length > 0 && (
          <nav className="brelated" aria-labelledby="related-heading">
            <h2 id="related-heading">Keep reading</h2>
            <ul>
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/blog/${r.slug}`}>{r.title}</Link>
                  <p>{r.description}</p>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="glass bcta">
          <h2>Turn your turnover photos into proof</h2>
          <p>
            TrackTub takes each guided photo in the app&rsquo;s camera, shows
            when it was taken, locks the record, and gives you a share link when
            an owner or guest asks.
          </p>
          <a href="/landing#join" className="btn">
            Get early access
          </a>
        </div>
      </article>
    </MarketingFrame>
  );
}
