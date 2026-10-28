// Shared inline styles for the People screen (app-tokens.css values).

export const card: React.CSSProperties = {
  background: "var(--tt-surface)",
  borderRadius: "var(--tt-radius-tile)",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: 48,
  border: 0,
  borderRadius: 999,
  background: "var(--tt-action)",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
};

export const quietButton: React.CSSProperties = {
  minHeight: "var(--tt-tap)",
  padding: "0 4px",
  border: 0,
  background: "none",
  color: "var(--tt-link)",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export const dangerButton: React.CSSProperties = {
  ...quietButton,
  color: "#F08A8A",
};

export const errorText: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "#F08A8A",
};

export const muted: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "var(--tt-text-2)",
};
