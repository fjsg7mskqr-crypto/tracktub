/**
 * Today prep brief — placeholder for Task 1. Task 2 replaces this with the
 * resumable tub-card list. Kept minimal so the shell + nav can be reviewed.
 */
export default function TodayPage() {
  return (
    <main style={{ padding: "24px 16px" }}>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--field-muted)",
          margin: "0 0 6px",
        }}
      >
        Field
      </p>
      <h1
        style={{
          fontFamily: "var(--field-serif)",
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.1,
          margin: 0,
          color: "var(--field-ink)",
        }}
      >
        Today
      </h1>
    </main>
  );
}
