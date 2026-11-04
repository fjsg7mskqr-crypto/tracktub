/**
 * Quiet loading placeholders for the signed-in screens (`loading.tsx`). Shown
 * the instant a tab is tapped, while the server renders the real screen. Plain
 * surface-coloured blocks laid out like the screen they stand in for; no
 * colour, so nothing reads as a status. The pulse lives in app-tokens.css
 * (`.tt-bone`) and stops under reduced motion.
 */

/** One placeholder block. */
export function Bone({
  w = "100%",
  h,
  r = 10,
  tone = "surface",
  style,
}: {
  w?: number | string;
  h: number | string;
  r?: number | string;
  tone?: "surface" | "raised" | "paper";
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className="tt-bone"
      style={{
        display: "block",
        flex: "none",
        width: w,
        height: h,
        borderRadius: r,
        background:
          tone === "paper"
            ? "#EEEFF1"
            : tone === "raised"
              ? "var(--tt-raised)"
              : "var(--tt-surface)",
        ...style,
      }}
    />
  );
}

/** The screen frame every signed-in page uses, marked busy for assistive tech. */
export function SkeletonScreen({
  children,
  label,
  gap = 24,
  top = 32,
}: {
  children: React.ReactNode;
  /** What is loading, e.g. "Loading tubs". */
  label: string;
  gap?: number;
  top?: number;
}) {
  return (
    <main
      aria-busy="true"
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        padding: `${top}px 20px 24px`,
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {children}
    </main>
  );
}

/** A screen title that is known before any data: rendered as real text. */
export function SkeletonTitle({
  children,
  size = 30,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <h1
      style={{
        margin: 0,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      {children}
    </h1>
  );
}

/** "‹ Label" back link placeholder, sized like BackLink. */
export function BackBone({ w = 72 }: { w?: number }) {
  return (
    <span
      style={{ display: "flex", alignItems: "center", height: "var(--tt-tap)" }}
    >
      <Bone w={w} h={16} r={6} />
    </span>
  );
}

/** A stack of list rows (tub rows, attention rows, sent records). */
export function RowBones({
  count,
  h = 64,
  r = "var(--tt-radius-tile)",
}: {
  count: number;
  h?: number;
  r?: number | string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} h={h} r={r} />
      ))}
    </div>
  );
}

/** Section label placeholder (the small uppercase headings). */
export function LabelBone({ w = 96 }: { w?: number }) {
  return <Bone w={w} h={12} r={4} />;
}
