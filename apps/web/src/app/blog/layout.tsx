import "../landing/landing.css";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <div className="tt-landing tt-blog">{children}</div>;
}
