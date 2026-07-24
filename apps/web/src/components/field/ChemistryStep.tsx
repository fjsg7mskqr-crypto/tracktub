"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FieldButton } from "@/components/field/FieldButton";
import { FieldScreenHeader } from "@/components/field/FieldScreenHeader";
import { RangeBar } from "@/components/field/RangeBar";
import { StatusPill } from "@/components/field/StatusPill";
import { Stepper } from "@/components/field/Stepper";
import {
  addIssuePhotoAction,
  saveDraftReadingAction,
  type DraftReading,
  type DraftSnapshot,
} from "@/lib/actions/turnover";
import {
  alkalinityOutOfRange,
  asSanitizerType,
  calciumHardnessOutOfRange,
  DEFAULT_SANITIZER_TYPE,
  phOutOfRange,
  sanitizerBand,
  sanitizerLabel,
  sanitizerOutOfRange,
  treatmentLabel,
  WATER_TREATMENTS,
  type SanitizerType,
} from "@/lib/chemistry";

export type RangeStatus = "ok" | "out" | "empty";
export type ChemMetric = "alkalinity" | "ph" | "hardness" | "sanitizer";

/**
 * The single source of truth for a metric's in-range status in the field flow.
 * Delegates to the tested predicates in `chemistry.ts` (PRD §8.8 thresholds) so
 * no threshold is ever duplicated here. `null`/`undefined` ⇒ `"empty"` (nothing
 * measured yet — the flow asserts nothing).
 */
export function fieldRangeStatus(
  metric: ChemMetric,
  value: number | null | undefined,
  sanitizerType: SanitizerType = DEFAULT_SANITIZER_TYPE
): RangeStatus {
  if (value == null) return "empty";
  const out =
    metric === "alkalinity"
      ? alkalinityOutOfRange(value)
      : metric === "ph"
        ? phOutOfRange(value)
        : metric === "hardness"
          ? calciumHardnessOutOfRange(value)
          : sanitizerOutOfRange(value, sanitizerType);
  return out ? "out" : "ok";
}

// ---------------------------------------------------------------------------

type ReadingState = {
  total_alkalinity: number | null;
  ph: number | null;
  calcium_hardness: number | null;
  sanitizer_ppm: number | null;
  temp_f: number | null;
  treatments: string[];
  treatment_note: string | null;
  balanced: boolean;
};

type MetricConfig = {
  metric: ChemMetric;
  field: "total_alkalinity" | "ph" | "calcium_hardness" | "sanitizer_ppm";
  label: string;
  unit: string;
  scaleMin: number;
  scaleMax: number;
  idealMin: number;
  idealMax: number;
  presets: number[];
  step: number;
  seed: number;
  format: (n: number) => string;
};

const int = (n: number) => String(Math.round(n));
const dec1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const ppm = (n: number) => (Number.isInteger(n) ? String(n) : dec1(n));

function metricConfigs(sanitizerType: SanitizerType): MetricConfig[] {
  const band = sanitizerBand(sanitizerType);
  return [
    {
      metric: "alkalinity",
      field: "total_alkalinity",
      label: "Total Alkalinity",
      unit: "ppm",
      scaleMin: 0,
      scaleMax: 240,
      idealMin: 80,
      idealMax: 120,
      presets: [40, 80, 100, 120, 160],
      step: 10,
      seed: 100,
      format: int,
    },
    {
      metric: "ph",
      field: "ph",
      label: "pH",
      unit: "",
      scaleMin: 6.8,
      scaleMax: 8.4,
      idealMin: 7.2,
      idealMax: 7.8,
      presets: [7.0, 7.2, 7.4, 7.6, 7.8],
      step: 0.1,
      seed: 7.4,
      format: dec1,
    },
    {
      metric: "hardness",
      field: "calcium_hardness",
      label: "Calcium Hardness",
      unit: "ppm",
      scaleMin: 0,
      scaleMax: 500,
      idealMin: 150,
      idealMax: 250,
      presets: [100, 150, 200, 250, 350],
      step: 25,
      seed: 200,
      format: int,
    },
    {
      metric: "sanitizer",
      field: "sanitizer_ppm",
      label: sanitizerLabel(sanitizerType),
      unit: "ppm",
      scaleMin: 0,
      scaleMax: 10,
      idealMin: band.min,
      idealMax: band.max,
      presets:
        sanitizerType === "bromine" ? [2, 3, 4, 5, 7] : [0, 1, 2, 3, 5],
      step: 0.5,
      seed: (band.min + band.max) / 2,
      format: ppm,
    },
  ];
}

function toReadingState(value: DraftReading | null): ReadingState {
  return {
    total_alkalinity: value?.total_alkalinity ?? null,
    ph: value?.ph ?? null,
    calcium_hardness: value?.calcium_hardness ?? null,
    sanitizer_ppm: value?.sanitizer_ppm ?? null,
    temp_f: value?.temp_f ?? null,
    treatments: value?.treatments ?? [],
    treatment_note: value?.treatment_note ?? null,
    balanced: value?.balanced ?? false,
  };
}

function readingFormData(
  propertyId: string,
  turnoverId: string,
  r: ReadingState
): FormData {
  const fd = new FormData();
  fd.append("propertyId", propertyId);
  fd.append("turnoverId", turnoverId);
  const num = (n: number | null) => (n == null ? "" : String(n));
  fd.append("total_alkalinity", num(r.total_alkalinity));
  fd.append("ph", num(r.ph));
  fd.append("calcium_hardness", num(r.calcium_hardness));
  fd.append("sanitizer_ppm", num(r.sanitizer_ppm));
  fd.append("temp_f", num(r.temp_f));
  fd.append("treatments", JSON.stringify(r.treatments));
  fd.append("treatment_note", r.treatment_note ?? "");
  fd.append("balanced", r.balanced ? "true" : "false");
  return fd;
}

/**
 * The record-only chemistry step (Task 4). One metric at a time —
 * TA → pH → hardness → sanitizer — captured by tapping a chunky preset pad or
 * snapping the strip (durable photo evidence), **never a keyboard**. Then the
 * treatments added + a "water balanced" attestation. Honest-evidence model
 * ([[chemistry-capture-model]]): this is the **as-found** reading plus what the
 * tech added and attested — NOT a post-balance re-reading, no dosing math.
 *
 * Everything persists through `saveDraftReadingAction` (readings, treatments,
 * note, and the balanced flag all live on `water_reading`), so backgrounding
 * mid-flow loses nothing.
 */
export function ChemistryStep({
  turnoverId,
  propertyId,
  sanitizerType,
  value,
  onDone,
  onBack,
  onSaved,
}: {
  turnoverId: string;
  propertyId: string;
  sanitizerType?: SanitizerType;
  value: DraftReading | null;
  onDone: () => void;
  onBack: () => void;
  onSaved?: (snapshot: DraftSnapshot) => void;
}) {
  const type = asSanitizerType(sanitizerType);
  const configs = metricConfigs(type);

  const [reading, setReading] = useState<ReadingState>(() =>
    toReadingState(value)
  );
  // "metric" screens are indexed 0..3; index 4 is the treatments screen.
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [stripCount, setStripCount] = useState(0);
  const [stripStatus, setStripStatus] = useState<"idle" | "saving" | "error">(
    "idle"
  );

  const onTreatments = index >= configs.length;

  async function persist(next: ReadingState) {
    setSaving(true);
    try {
      const snap = await saveDraftReadingAction(
        readingFormData(propertyId, turnoverId, next)
      );
      onSaved?.(snap);
    } finally {
      setSaving(false);
    }
  }

  function setMetric(cfg: MetricConfig, next: number) {
    setReading((r) => ({ ...r, [cfg.field]: next }));
  }

  async function goNext() {
    await persist(reading);
    setIndex((i) => i + 1);
  }

  function goBack() {
    if (index === 0) onBack();
    else setIndex((i) => i - 1);
  }

  async function finish() {
    await persist(reading);
    onDone();
  }

  async function onStripFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStripStatus("saving");
    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("turnoverId", turnoverId);
    fd.append("file", file);
    fd.append("caption", "Water test strip");
    fd.append("capturedAt", new Date().toISOString());
    try {
      const snap: DraftSnapshot = await addIssuePhotoAction(fd);
      setStripCount(snap.photos.filter((p) => p.slot === "issue").length);
      onSaved?.(snap);
      setStripStatus("idle");
    } catch {
      setStripStatus("error");
    }
  }

  function toggleTreatment(code: string) {
    setReading((r) => ({
      ...r,
      treatments: r.treatments.includes(code)
        ? r.treatments.filter((c) => c !== code)
        : [...r.treatments, code],
    }));
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
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onStripFile}
      />

      {onTreatments ? (
        <TreatmentsScreen
          reading={reading}
          saving={saving}
          onToggleTreatment={toggleTreatment}
          onNote={(note) =>
            setReading((r) => ({ ...r, treatment_note: note || null }))
          }
          onBalanced={(b) => setReading((r) => ({ ...r, balanced: b }))}
          onBack={goBack}
          onFinish={finish}
        />
      ) : (
        <MetricScreen
          cfg={configs[index]}
          stepNumber={index + 1}
          stepTotal={configs.length}
          sanitizerType={type}
          value={reading[configs[index].field]}
          saving={saving}
          stripCount={stripCount}
          stripStatus={stripStatus}
          onSnapStrip={() => fileRef.current?.click()}
          onChange={(n) => setMetric(configs[index], n)}
          onBack={goBack}
          onNext={goNext}
          nextLabel={
            index === configs.length - 1
              ? "Next — treatments"
              : `Next — ${configs[index + 1].label}`
          }
        />
      )}
    </main>
  );
}

// --- One metric card -------------------------------------------------------

function MetricScreen({
  cfg,
  stepNumber,
  stepTotal,
  sanitizerType,
  value,
  saving,
  stripCount,
  stripStatus,
  onSnapStrip,
  onChange,
  onBack,
  onNext,
  nextLabel,
}: {
  cfg: MetricConfig;
  stepNumber: number;
  stepTotal: number;
  sanitizerType: SanitizerType;
  value: number | null;
  saving: boolean;
  stripCount: number;
  stripStatus: "idle" | "saving" | "error";
  onSnapStrip: () => void;
  onChange: (n: number) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const status = fieldRangeStatus(cfg.metric, value, sanitizerType);

  return (
    <>
      <FieldScreenHeader
        eyebrow={`As-found · Step ${stepNumber} of ${stepTotal}`}
        title={cfg.label}
      />

      <div
        style={{
          background: "var(--field-card)",
          borderRadius: 20,
          border: "1px solid rgba(8, 9, 10, 0.06)",
          padding: "22px 20px",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--field-serif)",
              fontSize: 76,
              lineHeight: 1,
              fontWeight: 600,
              color: value == null ? "var(--field-muted)" : "var(--field-ink)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value == null ? "—" : cfg.format(value)}
          </span>
          {cfg.unit && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 500,
                color: "var(--field-muted)",
              }}
            >
              {cfg.unit}
            </span>
          )}
        </div>

        <RangeBar
          scaleMin={cfg.scaleMin}
          scaleMax={cfg.scaleMax}
          idealMin={cfg.idealMin}
          idealMax={cfg.idealMax}
          value={value}
          formatLabel={cfg.format}
        />

        <StatusPill status={status} />
      </div>

      <Stepper
        value={value}
        presets={cfg.presets}
        step={cfg.step}
        min={cfg.scaleMin}
        max={cfg.scaleMax}
        seed={cfg.seed}
        format={cfg.format}
        onChange={onChange}
      />

      <button
        type="button"
        onClick={onSnapStrip}
        style={{
          appearance: "none",
          background: "transparent",
          border: "none",
          padding: "6px 4px",
          minHeight: 40,
          alignSelf: "center",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-sans)",
          fontSize: 15,
          fontWeight: 600,
          color:
            stripStatus === "error" ? "#b45309" : "var(--field-accent)",
          cursor: "pointer",
        }}
      >
        <span aria-hidden="true">◎</span>
        {stripStatus === "saving"
          ? "Saving strip photo…"
          : stripStatus === "error"
            ? "Strip photo failed — tap to retry"
            : stripCount > 0
              ? `Strip photo saved (${stripCount}) — snap another`
              : "Snap the strip instead"}
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldButton
          type="button"
          onClick={onNext}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : nextLabel}
        </FieldButton>
        <BackLink onClick={onBack} />
      </div>
    </>
  );
}

// --- Treatments + attestation ----------------------------------------------

function TreatmentsScreen({
  reading,
  saving,
  onToggleTreatment,
  onNote,
  onBalanced,
  onBack,
  onFinish,
}: {
  reading: ReadingState;
  saving: boolean;
  onToggleTreatment: (code: string) => void;
  onNote: (note: string) => void;
  onBalanced: (b: boolean) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <>
      <FieldScreenHeader
        eyebrow="Water · Treatments"
        title="What did you add?"
        hint="As-found reading is saved. Record what you added and attest the water was left balanced — not a re-test."
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {WATER_TREATMENTS.map((t) => {
          const active = reading.treatments.includes(t.code);
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => onToggleTreatment(t.code)}
              style={{
                appearance: "none",
                minHeight: 48,
                padding: "10px 16px",
                borderRadius: 999,
                border: active
                  ? "1px solid var(--field-accent)"
                  : "1px solid rgba(8, 9, 10, 0.12)",
                background: active ? "var(--field-accent)" : "var(--field-card)",
                color: active ? "#ffffff" : "var(--field-ink)",
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {treatmentLabel(t.code)}
            </button>
          );
        })}
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--field-muted)",
          }}
        >
          Amounts / anything custom (optional)
        </span>
        <textarea
          value={reading.treatment_note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          rows={2}
          placeholder="e.g. 2 caps of shock, 1 tbsp pH Down"
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            borderRadius: 14,
            border: "1px solid rgba(8, 9, 10, 0.14)",
            background: "var(--field-card)",
            padding: "12px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            color: "var(--field-ink)",
          }}
        />
      </label>

      <button
        type="button"
        role="switch"
        aria-checked={reading.balanced}
        onClick={() => onBalanced(!reading.balanced)}
        style={{
          appearance: "none",
          display: "flex",
          alignItems: "center",
          gap: 14,
          textAlign: "left",
          width: "100%",
          padding: "16px 18px",
          borderRadius: 16,
          border: reading.balanced
            ? "1px solid rgba(52, 211, 153, 0.5)"
            : "1px solid rgba(8, 9, 10, 0.12)",
          background: reading.balanced
            ? "rgba(52, 211, 153, 0.1)"
            : "var(--field-card)",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            width: 46,
            height: 28,
            borderRadius: 999,
            background: reading.balanced
              ? "var(--field-ok)"
              : "rgba(8, 9, 10, 0.18)",
            position: "relative",
            transition: "background 120ms ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: reading.balanced ? 21 : 3,
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "#ffffff",
              transition: "left 120ms ease",
            }}
          />
        </span>
        <span style={{ display: "grid", gap: 2 }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--field-ink)",
            }}
          >
            Water left balanced
          </span>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              lineHeight: 1.4,
              color: "var(--field-muted)",
            }}
          >
            You attest the tub was left guest-ready. Recorded as your word, not a
            software claim.
          </span>
        </span>
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldButton
          type="button"
          onClick={onFinish}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : "Save water — on to after photos"}
        </FieldButton>
        <BackLink onClick={onBack} />
      </div>
    </>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
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
      Back
    </button>
  );
}
