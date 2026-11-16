import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders in-repo blog markdown with accessible external links. */
export function MarkdownBody({
  content,
  className = "bprose",
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div
              className="tbl-wrap"
              style={{ overflowX: "auto" }}
              tabIndex={0}
              role="region"
              aria-label="Table, scroll sideways"
            >
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
