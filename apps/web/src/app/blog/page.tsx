import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFrame } from "@/components/marketing/MarketingFrame";
import { getAllPosts } from "@/lib/blog";
import { marketingMetadata } from "@/lib/marketing-seo";

export const metadata: Metadata = marketingMetadata({
  title: "Resources — TrackTub",
  description:
    "Guides for self-managed STR hosts: hot tub turnover checklists, dispute documentation, water safety, and guest-ready proof.",
  pathname: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <MarketingFrame active="blog">
      <div className="bhero">
        <span className="eyebrow">Resources</span>
        <h1>Hot tub operations for STR hosts</h1>
        <p>
          Practical guides on turnover routines, documentation, and keeping your rental hot tub
          guest-ready — written for self-managed operators, not spa hobbyists.
        </p>
      </div>

      <div className="blist">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="glass bcard">
            <div className="meta">
              {post.pillar && <span className="pill">{post.pillar}</span>}
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </time>
            </div>
            <h2>{post.title}</h2>
            <p>{post.description}</p>
          </Link>
        ))}
      </div>
    </MarketingFrame>
  );
}
