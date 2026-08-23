import "../landing/landing.css";
import "./blog.css";

// MUST stay dynamic — see the note in src/app/login/layout.tsx (#41, #271, #281).
// Applies to /blog and every /blog/[slug]: the enforcing CSP is nonce-based with
// 'strict-dynamic', so prerendered HTML is served nonce-less and all of its
// scripts are blocked (no hydration, no client routing, no analytics).
export const dynamic = "force-dynamic";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className="tt-landing tt-blog">{children}</div>;
}
