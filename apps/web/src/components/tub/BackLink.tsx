import Link from "next/link";

/** "‹ Tubs" back link at the top of a tub screen (mockup). */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: "var(--tt-tap)",
        alignSelf: "flex-start",
        color: "var(--tt-link)",
        fontSize: 16,
        fontWeight: 500,
        textDecoration: "none",
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}
