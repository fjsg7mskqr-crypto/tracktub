import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders in-repo blog markdown with accessible external links. */
export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="bprose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
