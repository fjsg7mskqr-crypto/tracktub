/**
 * Placeholder body for a tab whose screen hasn't been built yet. The owning
 * lane replaces the page that renders it (route contract in
 * docs/superpowers/plans/2026-10-27-app-rebuild.md).
 */
export function StubPage({ title }: { title: string }) {
  return (
    <main style={{ padding: "32px 20px", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em" }}>
        {title}
      </h1>
    </main>
  );
}
