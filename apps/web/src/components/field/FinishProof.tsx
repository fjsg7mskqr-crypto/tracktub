"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldButton } from "@/components/field/FieldButton";
import { FieldScreenHeader } from "@/components/field/FieldScreenHeader";
import {
  fieldRangeStatus,
  type ChemMetric,
} from "@/components/field/ChemistryStep";
import { StatusPill } from "@/components/field/StatusPill";
import {
  lockTurnoverAction,
  type DraftPhoto,
  type DraftReading,
} from "@/lib/actions/turnover";
import { recordProofShare } from "@/lib/actions/proofEvent";
import { REQUIRED_LOCK_PHOTOS } from "@/lib/capture-v2";
import {
  asSanitizerType,
  sanitizerLabel,
  treatmentLabel,
  type SanitizerType,
} from "@/lib/chemistry";

// ---------------------------------------------------------------------------
// Honest-evidence copy (spec §8a). This is the ONLY place finish copy is built.
// It reports what was *measured* ("TA 120 as-found") and what the tech
// *attested* ("Tech marked balanced") — it NEVER claims the software verified or
// vouched for the water. The tech attests; the app timestamps and preserves.
// ---------------------------------------------------------------------------

type FinishReadingLike = Pick<
  DraftReading,
  | "total_alkalinity"
  | "ph"
  | "calcium_hardness"
  | "sanitizer_ppm"
  | "treatments"
  | "treatment_note"
> | null;

type FinishMeta = { balanced: boolean };

const fmtInt = (n: number) => String(Math.round(n));
const fmtPh = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const fmtPpm = (n: number) =>
  Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);

/**
 * Pure honest-evidence summary of a finished turnover's water record. Emits one
 * line per measured value as *as-found* (never corrected), a line for recorded
 * treatments (the tech's actions, not a claim), and — only when the tech
 * attested — a "marked balanced" line explicitly framed as the tech's word.
 * Never emits "verified guest-ready" or any phrasing implying the software
 * vouched for the water.
 */
export function finishSummaryLines(
  reading: FinishReadingLike,
  meta: FinishMeta
): string[] {
  const lines: string[] = [];

  if (reading) {
    if (reading.total_alkalinity != null)
      lines.push(`TA ${fmtInt(reading.total_alkalinity)} ppm as-found`);
    if (reading.ph != null) lines.push(`pH ${fmtPh(reading.ph)} as-found`);
    if (reading.calcium_hardness != null)
      lines.push(`Hardness ${fmtInt(reading.calcium_hardness)} ppm as-found`);
    if (reading.sanitizer_ppm != null)
      lines.push(`Sanitizer ${fmtPpm(reading.sanitizer_ppm)} ppm as-found`);

    const treatments = reading.treatments ?? [];
    if (treatments.length > 0)
      lines.push(`Added: ${treatments.map(treatmentLabel).join(", ")}`);
    if (reading.treatment_note)
      lines.push(`Note: ${reading.treatment_note}`);
  }

  if (meta.balanced) {
    lines.push("Tech marked balanced — recorded as the tech's word, not a software claim.");
  }

  return lines;
}

// ---------------------------------------------------------------------------

const METRICS: { metric: ChemMetric; field: keyof DraftReading; label: string }[] =
  [
    { metric: "alkalinity", field: "total_alkalinity", label: "Total Alkalinity" },
    { metric: "ph", field: "ph", label: "pH" },
    { metric: "hardness", field: "calcium_hardness", label: "Calcium Hardness" },
    { metric: "sanitizer", field: "sanitizer_ppm", label: "Sanitizer" },
  ];

function readingValueFmt(metric: ChemMetric, value: number | null): string {
  if (value == null) return "—";
  if (metric === "ph") return fmtPh(value);
  if (metric === "sanitizer") return fmtPpm(value);
  return fmtInt(value);
}

/**
 * The finish screen (Task 5). Assembles the honest proof summary — required
 * photo count, the four as-found chemistry readings with in-range status,
 * treatments, and the balanced attestation — then, only on an explicit tap,
 * runs the real irreversible lock (`lockTurnoverAction`) and surfaces the
 * existing token-based proof link (`/proof/<shareToken>`) to copy / share.
 * `recordProofShare` is logged when the tech shares. Nothing here fabricates,
 * corrects, or overstates a value.
 */
export function FinishProof({
  turnoverId,
  propertyId,
  propertyName,
  reading,
  photos,
  sanitizerType,
  onBack,
}: {
  turnoverId: string;
  propertyId: string;
  propertyName: string;
  reading: DraftReading | null;
  photos: DraftPhoto[];
  sanitizerType: SanitizerType;
  onBack: () => void;
}) {
  const router = useRouter();
  const type = asSanitizerType(sanitizerType);

  const [locked, setLocked] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const capturedRequired = useMemo(
    () =>
      REQUIRED_LOCK_PHOTOS.filter(({ slot, phase }) =>
        photos.some(
          (p) => p.slot === slot && p.phase === phase && !!p.storagePath
        )
      ).length,
    [photos]
  );
  const allRequired = capturedRequired === REQUIRED_LOCK_PHOTOS.length;

  const summaryLines = useMemo(
    () => finishSummaryLines(reading, { balanced: reading?.balanced ?? false }),
    [reading]
  );

  const proofUrl =
    shareToken != null
      ? typeof window !== "undefined"
        ? `${window.location.origin}/proof/${shareToken}`
        : `/proof/${shareToken}`
      : null;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  // The real, irreversible finish. Only ever runs on an explicit user tap.
  async function handleFinish() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("propertyId", propertyId);
      fd.append("turnoverId", turnoverId);
      // Re-send the as-found reading so the lock's re-save preserves it
      // (an empty reading payload would clear water_reading).
      const num = (n: number | null | undefined) => (n == null ? "" : String(n));
      fd.append("total_alkalinity", num(reading?.total_alkalinity));
      fd.append("ph", num(reading?.ph));
      fd.append("calcium_hardness", num(reading?.calcium_hardness));
      fd.append("sanitizer_ppm", num(reading?.sanitizer_ppm));
      fd.append("temp_f", num(reading?.temp_f));
      fd.append("treatments", JSON.stringify(reading?.treatments ?? []));
      fd.append("treatment_note", reading?.treatment_note ?? "");
      fd.append("balanced", reading?.balanced ? "true" : "false");

      const result = await lockTurnoverAction(fd);
      setShareToken(result.shareToken || null);
      setLocked(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not finish the turnover — please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!proofUrl) return;
    try {
      await navigator.clipboard.writeText(proofUrl);
      void recordProofShare(turnoverId);
      flash("Proof link copied");
    } catch {
      flash("Copy failed — select the link manually");
    }
  }

  async function shareLink() {
    if (!proofUrl) return;
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({
          title: `${propertyName} — turnover proof`,
          text: `Turnover proof for ${propertyName}`,
          url: proofUrl,
        });
        void recordProofShare(turnoverId);
        return;
      } catch {
        // user cancelled or share unavailable — fall through to copy
      }
    }
    await copyLink();
  }

  return (
    <main
      style={{
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100dvh",
      }}
    >
      <FieldScreenHeader
        eyebrow="Proof"
        title={locked ? "Turnover complete" : "Review & send"}
        hint={
          locked
            ? `${propertyName} · locked and timestamped. Share the proof below.`
            : `${propertyName} · ${capturedRequired} of ${REQUIRED_LOCK_PHOTOS.length} required photos captured.`
        }
      />

      <div style={{ flex: 1, display: "grid", gap: 14, alignContent: "start" }}>
        {/* Photo count */}
        <SummaryCard>
          <Row
            label="Photos"
            value={`${capturedRequired} of ${REQUIRED_LOCK_PHOTOS.length} required`}
            emphasis={allRequired ? "ok" : "muted"}
          />
        </SummaryCard>

        {/* Chemistry — as-found readings with in-range status */}
        <SummaryCard>
          <p style={cardHeadingStyle}>Water — as found</p>
          <div style={{ display: "grid", gap: 12 }}>
            {METRICS.map(({ metric, field, label }) => {
              const value = (reading?.[field] as number | null | undefined) ?? null;
              const displayLabel =
                metric === "sanitizer" ? sanitizerLabel(type) : label;
              return (
                <div
                  key={metric}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--field-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {displayLabel}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        color: "var(--field-muted)",
                      }}
                    >
                      {readingValueFmt(metric, value)}
                      {value != null && metric !== "ph" ? " ppm" : ""} · as-found
                    </span>
                  </span>
                  <StatusPill status={fieldRangeStatus(metric, value, type)} />
                </div>
              );
            })}
          </div>
        </SummaryCard>

        {/* Treatments + attestation — honest-evidence lines */}
        <SummaryCard>
          <p style={cardHeadingStyle}>Recorded by the tech</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {(reading?.treatments ?? []).length > 0 ? (
              <li style={lineStyle}>
                Added: {(reading?.treatments ?? []).map(treatmentLabel).join(", ")}
              </li>
            ) : (
              <li style={{ ...lineStyle, color: "var(--field-muted)" }}>
                No treatments recorded.
              </li>
            )}
            {reading?.treatment_note ? (
              <li style={lineStyle}>Note: {reading.treatment_note}</li>
            ) : null}
            <li style={lineStyle}>
              {reading?.balanced
                ? "Tech marked the water balanced — recorded as the tech's word, not a software claim."
                : "Not marked balanced."}
            </li>
          </ul>
        </SummaryCard>

        {/* The proof link, once locked */}
        {locked && proofUrl && (
          <SummaryCard>
            <p style={cardHeadingStyle}>Proof link</p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--field-accent)",
                wordBreak: "break-all",
                margin: 0,
              }}
            >
              {proofUrl}
            </p>
          </SummaryCard>
        )}

        {error && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#b45309",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!locked ? (
          <>
            <FieldButton
              type="button"
              onClick={handleFinish}
              disabled={busy || !allRequired}
              style={{ opacity: busy || !allRequired ? 0.6 : 1 }}
            >
              {busy ? "Locking…" : "Send to homeowner"}
            </FieldButton>
            {!allRequired && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "var(--field-muted)",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Capture all required photos to lock and send.
              </p>
            )}
            <QuietButton onClick={onBack}>Back</QuietButton>
          </>
        ) : (
          <>
            <FieldButton type="button" onClick={shareLink}>
              Send to homeowner
            </FieldButton>
            <FieldButton type="button" variant="secondary" onClick={copyLink}>
              Copy link
            </FieldButton>
            <QuietButton onClick={() => router.push("/field/today")}>
              Done
            </QuietButton>
          </>
        )}
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 28,
            transform: "translateX(-50%)",
            background: "var(--field-ink)",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 999,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 6px 20px rgba(8, 9, 10, 0.25)",
            zIndex: 20,
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

const cardHeadingStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--field-muted)",
  margin: "0 0 12px",
};

const lineStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--field-ink)",
  margin: 0,
};

function SummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--field-card)",
        borderRadius: 18,
        border: "1px solid rgba(8, 9, 10, 0.06)",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis: "ok" | "muted";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--field-ink)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 600,
          color:
            emphasis === "ok" ? "#0f7a52" : "var(--field-muted)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        background: "transparent",
        border: "none",
        padding: "8px",
        minHeight: 44,
        fontFamily: "var(--font-sans)",
        fontSize: 15,
        fontWeight: 600,
        color: "var(--field-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
