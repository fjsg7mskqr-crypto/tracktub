"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  finishVisit,
  logReading,
  saveAdded,
  saveFlag,
  saveNotes,
  savePhoto,
  saveWork,
} from "@/lib/actions/visit";
import { recordPath, tubPath } from "@/lib/app-routes";
import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
  type ReadingKind,
} from "@/lib/readings";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { formatShortDate, formatTime } from "@/lib/time";
import type { CleaningStepCode } from "@/lib/types";
import {
  PHOTO_KINDS,
  WORK_CHIPS,
  missingParts,
  type AddedProduct,
  type PhotoKind,
  type ReadingValues,
  type VisitPhoto,
  type VisitSnapshot,
} from "@/lib/visit";
import { AddedList } from "./AddedList";
import { CameraSheet, compressPhoto } from "./CameraSheet";
import { OwnerFlag } from "./OwnerFlag";
import { ReadingSheet } from "./ReadingSheet";


const CHIP_LABEL: Record<ReadingField, string> = {
  total_alkalinity: "Alk",
  ph: "pH",
  calcium_hardness: "Hard",
  sanitizer_ppm: "Cl",
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: Date }
  | { kind: "error" };

/** Screen 6: the visit, one scrolling page left open for the whole job. */
export function VisitScreen({ initial }: { initial: VisitSnapshot }) {
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [notes, setNotes] = useState(initial.notes);
  const [sheet, setSheet] = useState<ReadingKind | null>(null);
  const [camera, setCamera] = useState<PhotoKind | null>(null);
  const [uploading, setUploading] = useState<
    Partial<Record<PhotoKind, string>>
  >({});
  const [finishing, setFinishing] = useState(false);
  const pending = useRef(0);
  const savedNotes = useRef(initial.notes);
  const id = snap.visitId;

  /** Run one save; the returned snapshot is the new truth. */
  async function run(fn: () => Promise<VisitSnapshot>): Promise<boolean> {
    pending.current += 1;
    setSave({ kind: "saving" });
    try {
      const next = await fn();
      // While another save is in flight, keep the local (newer) chips and
      // products; the last save to land brings the server's copy.
      setSnap((cur) =>
        pending.current > 1
          ? { ...next, work: cur.work, added: cur.added }
          : next
      );
      pending.current -= 1;
      if (pending.current === 0) setSave({ kind: "saved", at: new Date() });
      return true;
    } catch {
      pending.current -= 1;
      setSave({ kind: "error" });
      return false;
    }
  }

  function toggleWork(code: CleaningStepCode) {
    const work = snap.work.includes(code)
      ? snap.work.filter((c) => c !== code)
      : [...snap.work, code];
    setSnap((s) => ({ ...s, work }));
    void run(() => saveWork(id, work));
  }

  function changeAdded(added: AddedProduct[]) {
    setSnap((s) => ({ ...s, added }));
    void run(() => saveAdded(id, added));
  }

  function changeFlag(flag: string | null) {
    setSnap((s) => ({ ...s, flag }));
    void run(() => saveFlag(id, flag));
  }

  function flushNotes() {
    if (notes === savedNotes.current) return;
    const value = notes;
    savedNotes.current = value;
    void run(() => saveNotes(id, value)).then((ok) => {
      if (!ok) savedNotes.current = "";
    });
  }

  // Autosave notes 800 ms after typing stops (and on blur, below).
  useEffect(() => {
    if (notes === savedNotes.current) return;
    const t = setTimeout(flushNotes, 800);
    return () => clearTimeout(t);
  });

  async function log(kind: ReadingKind, values: ReadingValues) {
    const ok = await run(() => logReading(id, kind, values));
    if (!ok) throw new Error("save failed");
    setSheet(null);
  }

  async function capture(kind: PhotoKind, file: File, capturedAt: string) {
    setCamera(null);
    const preview = URL.createObjectURL(file);
    setUploading((u) => ({ ...u, [kind]: preview }));
    const blob = await compressPhoto(file);
    const fd = new FormData();
    fd.set("visitId", id);
    fd.set("kind", kind);
    fd.set("file", blob, `${kind}.jpg`);
    fd.set("capturedAt", capturedAt);
    await run(() => savePhoto(fd));
    setUploading((u) => {
      const next = { ...u };
      delete next[kind];
      return next;
    });
    URL.revokeObjectURL(preview);
  }

  async function finish() {
    setFinishing(true);
    flushNotes();
    try {
      await finishVisit(id);
      router.push(recordPath(id));
    } catch {
      setFinishing(false);
      setSave({ kind: "error" });
    }
  }

  const photo = (k: PhotoKind) => snap.photos.find((p) => p.kind === k) ?? null;
  const lastShot = (k: PhotoKind) =>
    snap.previous?.photos.find((p) => p.kind === k) ?? null;
  const missing = missingParts(snap);

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "calc(16px + env(safe-area-inset-top)) 20px 40px",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href={tubPath(snap.propertyId)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minHeight: 44,
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
          {snap.propertyName}
        </Link>
        <SaveIndicator state={save} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Visit in progress
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
          Opened {formatTime(snap.openedAt)}. Leave it open while you work —
          everything saves as you go.
        </p>
      </div>

      <Section n={1} title="Before you touch it">
        <div style={grid2}>
          <PhotoTile
            kind="before"
            photo={photo("before")}
            preview={uploading.before}
            onOpen={() => setCamera("before")}
          />
          <PastTile
            shot={lastShot("after")}
            visitedOn={snap.previous?.visitedOn}
          />
        </div>
        <p style={hint}>
          Side by side so you&apos;re comparing against a photo, not your
          memory.
        </p>
      </Section>

      <Section n={2} title="Reading as found">
        {snap.found ? (
          <ReadingCard
            values={snap.found}
            at={snap.foundAt}
            onEdit={() => setSheet("found")}
          />
        ) : (
          <DashedButton onClick={() => setSheet("found")}>
            Log reading
          </DashedButton>
        )}
      </Section>

      <Section n={3} title="The work">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WORK_CHIPS.map((c) => {
            const on = snap.work.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggleWork(c.code)}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: 0,
                  background: on ? "#1E3A6B" : "var(--tt-raised)",
                  color: on ? "var(--tt-text)" : "#C4C8CF",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
              >
                {on && <span aria-hidden="true">✓ </span>}
                {c.label}
              </button>
            );
          })}
        </div>
        <h3
          style={{
            margin: "8px 0 0",
            fontSize: 15,
            fontWeight: 600,
            color: "#C4C8CF",
          }}
        >
          What you added
        </h3>
        <AddedList added={snap.added} onChange={changeAdded} />
      </Section>

      <Section n={4} title="Reading as left">
        {snap.left ? (
          <ReadingCard
            values={snap.left}
            at={snap.leftAt}
            onEdit={() => setSheet("left")}
          />
        ) : (
          <>
            <p style={hint}>
              Re-test after balancing. This is the reading the owner sees as how
              you left it.
            </p>
            <DashedButton onClick={() => setSheet("left")}>
              Log reading as left
            </DashedButton>
          </>
        )}
      </Section>

      <Section n={5} title="After">
        <div style={grid2}>
          <PhotoTile
            kind="after"
            photo={photo("after")}
            preview={uploading.after}
            onOpen={() => setCamera("after")}
          />
          <PhotoTile
            kind="cover"
            photo={photo("cover")}
            preview={uploading.cover}
            onOpen={() => setCamera("cover")}
          />
        </div>
      </Section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <label
          htmlFor="visit-notes"
          style={{ fontSize: 15, fontWeight: 600, color: "#C4C8CF" }}
        >
          Notes
        </label>
        <textarea
          id="visit-notes"
          rows={3}
          value={notes}
          placeholder="Anything worth remembering next time"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={flushNotes}
          style={{
            borderRadius: 18,
            border: 0,
            background: "var(--tt-surface)",
            color: "var(--tt-text)",
            fontSize: 16,
            padding: 14,
            fontFamily: "inherit",
            resize: "none",
          }}
        />
        <OwnerFlag flag={snap.flag} onSave={changeFlag} />
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={finish}
          disabled={finishing}
          style={{
            height: 56,
            borderRadius: 999,
            border: 0,
            background: "var(--tt-action)",
            color: "#FFFFFF",
            fontSize: 17,
            fontWeight: 600,
            fontFamily: "inherit",
            opacity: finishing ? 0.7 : 1,
          }}
        >
          {finishing ? "Locking…" : "Finish & lock record"}
        </button>
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: 13,
            color: "var(--tt-text-3)",
          }}
        >
          {missing.length > 0
            ? `Will be marked partial — no ${missing.join(", no ")}.`
            : "Everything's logged."}{" "}
          Nothing is required to finish.
        </p>
      </div>

      {sheet && (
        <ReadingSheet
          snapshot={snap}
          initialKind={sheet}
          onLog={log}
          onClose={() => setSheet(null)}
        />
      )}
      {camera && (
        <CameraSheet
          kind={camera}
          lastShot={lastShot(camera)}
          onCaptured={(file, at) => void capture(camera, file, at)}
          onClose={() => setCamera(null)}
        />
      )}
    </main>
  );
}

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};
const hint: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "var(--tt-text-2)",
};

function SaveIndicator({ state }: { state: SaveState }) {
  const base: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--tt-text-3)",
  };
  if (state.kind === "saving") return <span style={base}>Saving…</span>;
  if (state.kind === "error")
    return (
      <span
        role="alert"
        style={{ ...base, color: "var(--tt-due-text)", fontWeight: 600 }}
      >
        Not saved
      </span>
    );
  return (
    <span style={base} aria-live="polite">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path d="M5 12l5 5 9-10" />
      </svg>
      {state.kind === "saved" ? `Saved ${formatTime(state.at)}` : "All saved"}
    </span>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "var(--tt-raised)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {n}
        </span>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DashedButton({
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: 64,
        borderRadius: "var(--tt-radius-card)",
        border: "2px dashed #2A4A80",
        background: "transparent",
        color: "#A9C9FF",
        fontSize: 17,
        fontWeight: 600,
        fontFamily: "inherit",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      </svg>
      {children}
    </button>
  );
}

function ReadingCard({
  values,
  at,
  onEdit,
}: {
  values: ReadingValues;
  at: string | null;
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--tt-surface)",
        borderRadius: "var(--tt-radius-card)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {at && (
        <span style={{ fontSize: 12, color: "var(--tt-text-3)" }}>
          Logged {formatTime(at)}
        </span>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {READING_FIELDS.map((f) => {
          const v = values[f];
          const out = inRange(f, v) === false;
          return (
            <span
              key={f}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 15,
                background: out ? "rgba(232,163,61,0.14)" : "var(--tt-raised)",
                color: out ? "var(--tt-due-text)" : "var(--tt-text)",
                fontWeight: out ? 600 : 400,
              }}
            >
              {`${CHIP_LABEL[f]} ${v === null ? "—" : v.toFixed(READING_TARGETS[f].decimals)}`}
            </span>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onEdit}
        style={{
          height: 48,
          borderRadius: 999,
          border: 0,
          background: "var(--tt-raised)",
          color: "var(--tt-text)",
          fontSize: 16,
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        Edit reading
      </button>
    </div>
  );
}

const tile: React.CSSProperties = {
  aspectRatio: "1",
  borderRadius: "var(--tt-radius-tile)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  padding: 12,
  boxSizing: "border-box",
  overflow: "hidden",
  position: "relative",
};

function PhotoTile({
  kind,
  photo,
  preview,
  onOpen,
}: {
  kind: PhotoKind;
  photo: VisitPhoto | null;
  preview?: string;
  onOpen: () => void;
}) {
  const label = PHOTO_KINDS[kind].label;
  const src = preview ?? (photo ? photoPublicUrl(photo.storagePath) : null);
  if (!src) {
    return (
      <button
        type="button"
        onClick={onOpen}
        style={{
          ...tile,
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          border: "2px dashed #3A3F48",
          background: "transparent",
          color: "#C4C8CF",
          fontFamily: "inherit",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} — retake`}
      style={{
        ...tile,
        border: 0,
        background: `#1B2A44 center / cover no-repeat url("${src}")`,
        color: "var(--tt-text)",
        fontFamily: "inherit",
        alignItems: "flex-start",
        textAlign: "left",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(transparent 50%, rgba(0,0,0,0.65))",
        }}
      />
      <span style={{ position: "relative", fontSize: 14, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ position: "relative", fontSize: 12, color: "#C9D6EE" }}>
        {preview
          ? "Saving…"
          : photo?.capturedAt
            ? formatTime(photo.capturedAt)
            : null}
      </span>
    </button>
  );
}

function PastTile({
  shot,
  visitedOn,
}: {
  shot: VisitPhoto | null;
  visitedOn?: string;
}) {
  return (
    <div
      style={{
        ...tile,
        background: shot
          ? `#131417 center / cover no-repeat url("${photoPublicUrl(shot.storagePath)}")`
          : "var(--tt-surface)",
      }}
    >
      {shot && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(transparent 50%, rgba(0,0,0,0.65))",
          }}
        />
      )}
      <span
        style={{
          position: "relative",
          fontSize: 14,
          fontWeight: 600,
          color: "#C4C8CF",
        }}
      >
        Last visit
      </span>
      <span
        style={{
          position: "relative",
          fontSize: 12,
          color: "var(--tt-text-3)",
        }}
      >
        {shot && visitedOn ? (
          <>{formatShortDate(visitedOn)} · after</>
        ) : (
          "No earlier photo"
        )}
      </span>
    </div>
  );
}
