"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  finishVisit,
  leaveOpenItem,
  logReading,
  saveAdded,
  setOpenItemStatus,
  saveFlag,
  saveNextVisit,
  saveNotes,
  savePhoto,
  saveWork,
} from "@/lib/actions/visit";
import { recordPath, tubPath } from "@/lib/app-routes";
import { compressPhoto, PHOTO_FAILED_MESSAGE } from "@/lib/compress-photo";
import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
  type ReadingKind,
} from "@/lib/readings";
import { formatShortDate, formatTime } from "@/lib/time";
import { useTimeZone } from "@/components/app/TimeZone";
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
import {
  recheckSuggestions,
  type OpenItemKind,
} from "@/components/home/open-items";
import {
  EXPIRED_NOTE,
  PhotoViewer,
  type ViewerPhoto,
} from "@/components/photo/PhotoViewer";
import { AddedList } from "./AddedList";
import { LeaveForNext, LeftOpen } from "./OpenItems";
import { NextVisitPicker, dayLabel } from "./NextVisitPicker";
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
  const tz = useTimeZone();
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [notes, setNotes] = useState(initial.notes);
  const [sheet, setSheet] = useState<ReadingKind | null>(null);
  // Full-size viewer: this visit's photos, or last visit's single shot.
  const [viewer, setViewer] = useState<
    { mode: "mine"; kind: PhotoKind } | { mode: "last"; kind: PhotoKind } | null
  >(null);
  const openedFrom = useRef<string | null>(null);
  const [uploading, setUploading] = useState<
    Partial<Record<PhotoKind, string>>
  >({});
  const [photoFailed, setPhotoFailed] = useState<
    Partial<Record<PhotoKind, boolean>>
  >({});
  const [finishing, setFinishing] = useState(false);
  const [reminded, setReminded] = useState<string | null>(null);
  const pending = useRef(0);
  const savedNotes = useRef(initial.notes);
  const id = snap.visitId;

  // Return focus to the tile the viewer was last opened from.
  useEffect(() => {
    if (viewer === null && openedFrom.current !== null) {
      document
        .querySelector<HTMLElement>(`[data-photo-key="${openedFrom.current}"]`)
        ?.focus();
      openedFrom.current = null;
    }
  }, [viewer]);

  function viewMine(kind: PhotoKind) {
    openedFrom.current = `mine:${kind}`;
    setViewer({ mode: "mine", kind });
  }
  function viewLast(kind: PhotoKind, from: string) {
    openedFrom.current = from;
    setViewer({ mode: "last", kind });
  }

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
          ? {
              ...next,
              work: cur.work,
              added: cur.added,
              productSuggestions: cur.productSuggestions,
            }
          : { ...next, productSuggestions: cur.productSuggestions }
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

  function setItem(taskId: string, status: "settled" | "open" | "dismissed") {
    setSnap((s) => ({
      ...s,
      openItems:
        status === "dismissed"
          ? s.openItems.filter((i) => i.id !== taskId)
          : s.openItems.map((i) =>
              i.id === taskId
                ? { ...i, status: status === "open" ? "open" : "settled" }
                : i
            ),
    }));
    void run(() => setOpenItemStatus(id, taskId, status));
  }

  function scheduleNext(dueOn: string | null, reason: string) {
    setSnap((s) => ({
      ...s,
      nextVisit: dueOn ? { dueOn, reason: reason.trim() } : null,
    }));
    void run(() => saveNextVisit(id, dueOn, reason));
  }

  function leave(kind: OpenItemKind, text: string, note: string) {
    void run(() => leaveOpenItem(id, kind, text, note));
  }

  /** One tap: turn the written note into an open item for the next visit. */
  function remindNextVisit() {
    const text = notes.trim().slice(0, 200);
    if (!text || reminded === text) return;
    setReminded(text);
    flushNotes();
    void run(() => leaveOpenItem(id, "other", text, "")).then((ok) => {
      if (!ok) setReminded(null);
    });
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
    setPhotoFailed((f) => ({ ...f, [kind]: false }));
    const preview = URL.createObjectURL(file);
    setUploading((u) => ({ ...u, [kind]: preview }));
    try {
      let blob: Blob;
      try {
        blob = await compressPhoto(file);
      } catch {
        // Never upload the unprocessed original: it still has location data.
        setPhotoFailed((f) => ({ ...f, [kind]: true }));
        return;
      }
      const fd = new FormData();
      fd.set("visitId", id);
      fd.set("kind", kind);
      fd.set("file", blob, `${kind}.jpg`);
      fd.set("capturedAt", capturedAt);
      await run(() => savePhoto(fd));
    } finally {
      setUploading((u) => {
        const next = { ...u };
        delete next[kind];
        return next;
      });
      URL.revokeObjectURL(preview);
    }
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
  // This visit's taken photos in on-screen order, for the viewer.
  const mine = (["before", "after", "cover"] as const).flatMap((k) => {
    const url = uploading[k] ?? photo(k)?.url ?? null;
    if (!url) return [];
    const at = photo(k)?.capturedAt;
    const shot: ViewerPhoto & { kind: PhotoKind } = {
      kind: k,
      label: PHOTO_KINDS[k].label,
      url,
      time: uploading[k] ? "Saving…" : at ? formatTime(at, tz) : undefined,
    };
    return [shot];
  });
  // Reload only loses work that has not landed yet; say so only when true.
  const allSaved =
    save.kind !== "saving" &&
    save.kind !== "error" &&
    notes === snap.notes &&
    Object.keys(uploading).length === 0 &&
    !Object.values(photoFailed).some(Boolean);
  const expiredNote = allSaved
    ? "This photo link expired. Reload the page to see it (your visit is saved)."
    : EXPIRED_NOTE;
  const missing = missingParts(snap);
  const earlier = snap.openItems.filter((i) => i.openedVisitId !== id);
  const leftHere = snap.openItems.filter(
    (i) => i.openedVisitId === id && i.status === "open"
  );

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
          Opened {formatTime(snap.openedAt, tz)}. Leave it open while you work —
          everything saves as you go.
        </p>
      </div>

      {snap.scheduledHere && (
        <section
          aria-label="Scheduled re-check"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 16,
            borderRadius: "var(--tt-radius-card)",
            background: "var(--tt-surface)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--tt-link)",
            }}
          >
            Scheduled re-check
            <span style={{ fontWeight: 400, color: "var(--tt-text-3)" }}>
              {` · for ${dayLabel(snap.scheduledHere.dueOn)}`}
            </span>
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              overflowWrap: "anywhere",
            }}
          >
            {snap.scheduledHere.reason || "Check this tub again."}
          </p>
        </section>
      )}
      <LeftOpen items={earlier} onSetStatus={setItem} />
      {snap.previous?.notes && (
        <section
          aria-label="Last visit's note"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 16,
            borderRadius: "var(--tt-radius-card)",
            background: "var(--tt-surface)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "#C4C8CF",
            }}
          >
            Last visit&apos;s note
            <span style={{ fontWeight: 400, color: "var(--tt-text-3)" }}>
              {` · ${formatShortDate(snap.previous.visitedOn, tz)}`}
            </span>
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {snap.previous.notes}
          </p>
        </section>
      )}

      <Section n={1} title="Before you touch it">
        <div style={grid2}>
          <PhotoTile
            kind="before"
            photo={photo("before")}
            preview={uploading.before}
            failed={photoFailed.before}
            lastShot={null}
            onCaptured={(f, at) => void capture("before", f, at)}
            onView={() => viewMine("before")}
            photoKey={"mine:before"}
            onViewLast={() => undefined}
          />
          <PastTile
            shot={lastShot("after")}
            visitedOn={snap.previous?.visitedOn}
            onView={() => viewLast("after", "past")}
            photoKey={"past"}
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
        <AddedList
          added={snap.added}
          suggestions={snap.productSuggestions}
          onChange={changeAdded}
        />
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
          {(["after", "cover"] as const).map((k) => (
            <PhotoTile
              key={k}
              kind={k}
              photo={photo(k)}
              preview={uploading[k]}
              failed={photoFailed[k]}
              lastShot={lastShot(k)}
              onCaptured={(f, at) => void capture(k, f, at)}
              onView={() => viewMine(k)}
              photoKey={`mine:${k}`}
              onViewLast={() => viewLast(k, `thumb:${k}`)}
              thumbKey={`thumb:${k}`}
            />
          ))}
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
        <button
          type="button"
          onClick={remindNextVisit}
          disabled={notes.trim() === ""}
          style={{
            minHeight: 48,
            borderRadius: 999,
            border: 0,
            background: "var(--tt-raised)",
            color: "var(--tt-text)",
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "inherit",
            opacity: notes.trim() === "" ? 0.5 : 1,
          }}
        >
          Remind me next visit
        </button>
        {reminded !== null && reminded === notes.trim().slice(0, 200) ? (
          <p role="status" style={{ ...hint, color: "var(--tt-ok)" }}>
            ✓ Will show at the next visit
          </p>
        ) : (
          <p style={hint}>
            Notes stay on this record. Tap to also show this at the next visit.
          </p>
        )}
      </section>

      <LeaveForNext
        left={leftHere}
        suggestions={recheckSuggestions(snap.left, snap.openItems)}
        onLeave={leave}
        onSetStatus={setItem}
      />

      <OwnerFlag flag={snap.flag} onSave={changeFlag} />

      <NextVisitPicker value={snap.nextVisit} onSave={scheduleNext} />

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
      {viewer?.mode === "mine" && mine.length > 0 && (
        <PhotoViewer
          photos={mine}
          viewable={mine.map((_, n) => n)}
          index={Math.max(
            0,
            mine.findIndex((m) => m.kind === viewer.kind)
          )}
          onIndex={(n) => viewMine(mine[n].kind)}
          onClose={() => setViewer(null)}
          expiredNote={expiredNote}
          renderAction={(n) => (
            <label className="tt-photo-viewer-retake">
              <CameraIcon />
              Retake
              <CameraInput
                onFile={(file) => {
                  const kind = mine[n].kind;
                  setViewer(null);
                  void capture(kind, file, new Date().toISOString());
                }}
              />
            </label>
          )}
        />
      )}
      {viewer?.mode === "last" && lastShot(viewer.kind)?.url && (
        <PhotoViewer
          photos={[
            {
              label: PHOTO_KINDS[viewer.kind].label,
              url: lastShot(viewer.kind)?.url ?? null,
              subtitle: lastVisitLabel(snap.previous?.visitedOn, tz),
            },
          ]}
          viewable={[0]}
          index={0}
          onIndex={() => undefined}
          onClose={() => setViewer(null)}
          expiredNote={expiredNote}
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
  const tz = useTimeZone();
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
      {state.kind === "saved"
        ? `Saved ${formatTime(state.at, tz)}`
        : "All saved"}
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
  const tz = useTimeZone();
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
          Logged {formatTime(at, tz)}
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

function lastVisitLabel(visitedOn: string | undefined, tz: string) {
  return visitedOn
    ? `Last visit · ${formatShortDate(visitedOn, tz)}`
    : "Last visit";
}

function CameraIcon({ size = 20 }: Readonly<{ size?: number }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** Capture-only file input, hidden inside its <label> so a tap is a direct gesture (iOS). */
function CameraInput({ onFile }: Readonly<{ onFile: (file: File) => void }>) {
  return (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFile(file);
      }}
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
    />
  );
}

/**
 * One photo step. An empty tile is a <label> around a capture-only file
 * input, so a single tap opens the phone camera (iOS allows this because the
 * tap lands on the label itself). A taken tile is a button that opens the
 * full-size viewer, where Retake lives. Last visit's shot is a separate small
 * thumbnail button, so tapping it never opens the camera.
 */
function PhotoTile({
  kind,
  photo,
  preview,
  failed,
  lastShot,
  onCaptured,
  onView,
  photoKey,
  onViewLast,
  thumbKey,
}: Readonly<{
  kind: PhotoKind;
  photo: VisitPhoto | null;
  preview?: string;
  failed?: boolean;
  lastShot: VisitPhoto | null;
  onCaptured: (file: File, capturedAt: string) => void;
  onView: () => void;
  photoKey: string;
  onViewLast: () => void;
  thumbKey?: string;
}>) {
  const tz = useTimeZone();
  const label = PHOTO_KINDS[kind].label;
  const src = preview ?? photo?.url ?? null;
  const input = (
    <CameraInput
      onFile={(file) => onCaptured(file, new Date().toISOString())}
    />
  );
  return (
    <div style={{ position: "relative" }}>
      {src ? (
        <button
          type="button"
          data-photo-key={photoKey}
          aria-label={`View ${label} photo`}
          onClick={onView}
          style={{
            ...tile,
            width: "100%",
            border: 0,
            font: "inherit",
            background: `#1B2A44 center / cover no-repeat url("${src}")`,
            color: "var(--tt-text)",
            alignItems: "flex-start",
            textAlign: "left",
            cursor: "pointer",
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
          <span
            style={{ position: "relative", fontSize: 12, color: "#C9D6EE" }}
          >
            {preview
              ? "Saving…"
              : photo?.capturedAt
                ? formatTime(photo.capturedAt, tz)
                : null}
          </span>
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", right: 10, bottom: 10 }}
          >
            <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
          </svg>
        </button>
      ) : (
        <label
          style={{
            ...tile,
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            border: "2px dashed #3A3F48",
            color: "#C4C8CF",
            cursor: "pointer",
          }}
        >
          <CameraIcon size={28} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
          {input}
        </label>
      )}
      {failed && (
        <label
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            minHeight: 44,
            marginTop: 8,
            padding: "8px 12px",
            boxSizing: "border-box",
            borderRadius: 12,
            background: "var(--tt-raised)",
            color: "var(--tt-text)",
            fontSize: 14,
            fontWeight: 500,
            lineHeight: 1.35,
            overflowWrap: "anywhere",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span>
            {PHOTO_FAILED_MESSAGE}{" "}
            <span style={{ textDecoration: "underline", fontWeight: 600 }}>
              Retake
            </span>
          </span>
          {input}
        </label>
      )}
      {lastShot?.url && (
        <button
          type="button"
          data-photo-key={thumbKey}
          aria-label={`Last visit's ${label} photo — view`}
          onClick={onViewLast}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 52,
            height: 52,
            borderRadius: 12,
            border: "2px solid rgba(255,255,255,0.6)",
            background: `#131417 center / cover no-repeat url("${lastShot.url}")`,
            padding: 0,
          }}
        />
      )}
    </div>
  );
}

/** Last visit's shot of one kind, large. Tap anywhere to close. */
function LastShotViewer({
  kind,
  shot,
  visitedOn,
  onClose,
}: {
  kind: PhotoKind;
  shot: VisitPhoto | null;
  visitedOn?: string;
  onClose: () => void;
}) {
  const tz = useTimeZone();
  if (!shot) return null;
  const label = PHOTO_KINDS[kind].label;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Last visit · ${label}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 16,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS */}
      <img
        src={shot.url ?? undefined}
        alt={`Last visit's ${label} photo`}
        style={{ maxWidth: "100%", maxHeight: "80%", objectFit: "contain" }}
      />
      <span style={{ fontSize: 14, color: "#C4C8CF" }}>
        Last visit · {label}
        {visitedOn ? ` · ${formatShortDate(visitedOn, tz)}` : ""} — tap to close
      </span>
    </div>
  );
}

function PastTile({
  shot,
  visitedOn,
  onView,
  photoKey,
}: Readonly<{
  shot: VisitPhoto | null;
  visitedOn?: string;
  onView: () => void;
  photoKey: string;
}>) {
  const tz = useTimeZone();
  const style: React.CSSProperties = {
    ...tile,
    background: shot
      ? shot.url
        ? `#131417 center / cover no-repeat url("${shot.url}")`
        : "#131417"
      : "var(--tt-surface)",
  };
  const content = (
    <>
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
          <>{formatShortDate(visitedOn, tz)} · after</>
        ) : (
          "No earlier photo"
        )}
      </span>
      {shot?.url && (
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "absolute", right: 10, bottom: 10 }}
        >
          <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
        </svg>
      )}
    </>
  );
  if (!shot?.url) return <div style={style}>{content}</div>;
  return (
    <button
      type="button"
      data-photo-key={photoKey}
      aria-label={`View last visit's ${PHOTO_KINDS.after.label} photo`}
      onClick={onView}
      style={{
        ...style,
        width: "100%",
        border: 0,
        font: "inherit",
        textAlign: "left",
        alignItems: "flex-start",
        cursor: "pointer",
      }}
    >
      {content}
    </button>
  );
}
