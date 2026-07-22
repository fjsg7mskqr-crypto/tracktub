"use client";

/**
 * The no-keyboard value entry for a chemistry metric: a row of preset chips
 * (the common readings) plus big − / + steppers for fine adjustment. Values are
 * JetBrains Mono (data). Fat thumb targets; nothing here opens a keyboard, so it
 * works one-handed in the field whether the number came from a strip or a
 * titration.
 *
 * `value === null` means "not set yet" — the steppers seed from `seed` on first
 * touch so the tech starts from a sensible reading rather than zero.
 */
export function Stepper({
  value,
  presets,
  step,
  min,
  max,
  seed,
  format = (n) => String(n),
  onChange,
}: {
  value: number | null;
  presets: number[];
  step: number;
  min: number;
  max: number;
  seed: number;
  format?: (n: number) => string;
  onChange: (next: number) => void;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)));
  const nudge = (dir: 1 | -1) =>
    onChange(clamp((value ?? seed) + dir * step));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {presets.map((p) => {
          const active = value != null && Math.abs(value - p) < step / 2;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(clamp(p))}
              style={{
                appearance: "none",
                flex: "1 1 auto",
                minWidth: 56,
                minHeight: 48,
                padding: "10px 12px",
                borderRadius: 12,
                border: active
                  ? "1px solid var(--field-accent)"
                  : "1px solid rgba(8, 9, 10, 0.08)",
                background: active ? "var(--field-accent)" : "#eef1f6",
                color: active ? "#ffffff" : "var(--field-ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {format(p)}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <StepButton label="Decrease" symbol="−" onClick={() => nudge(-1)} />
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            color: "var(--field-muted)",
          }}
        >
          step {format(step)}
        </span>
        <StepButton label="Increase" symbol="+" onClick={() => nudge(1)} />
      </div>
    </div>
  );
}

function StepButton({
  label,
  symbol,
  onClick,
}: {
  label: string;
  symbol: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        appearance: "none",
        width: 72,
        height: 56,
        borderRadius: 14,
        border: "1px solid rgba(37, 99, 235, 0.35)",
        background: "var(--field-card)",
        color: "var(--field-accent)",
        fontFamily: "var(--font-mono)",
        fontSize: 28,
        fontWeight: 600,
        lineHeight: 1,
        cursor: "pointer",
      }}
    >
      {symbol}
    </button>
  );
}
