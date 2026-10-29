/** Small uppercase section heading used on the tub screens (mockup). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--tt-text-3)",
      }}
    >
      {children}
    </h2>
  );
}
