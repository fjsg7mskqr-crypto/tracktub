"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea, Note } from "@/components/ui";
import {
  addDays,
  weekDays,
  monthGrid,
  bucketByDay,
  upcoming,
} from "@/lib/calendar";
import {
  createScheduledItemAction,
  editScheduledItemAction,
  rescheduleScheduledItemAction,
  assignScheduledItemAction,
  markScheduledItemDoneAction,
  skipScheduledItemAction,
  completeMaintenanceOccurrenceAction,
} from "@/lib/actions/scheduled";
import type { ScheduleEntry, PropertyLite, MemberLite } from "./page";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function dayNum(iso: string): number {
  return Number(iso.slice(8, 10));
}

function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

function periodLabel(
  view: "week" | "month",
  anchor: string,
  days: { date: string }[]
): string {
  if (view === "month") {
    const [y, m] = anchor.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const start = days[0]?.date ?? anchor;
  const end = days[days.length - 1]?.date ?? anchor;
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  const year = start.slice(0, 4);
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
}

function chipTone(e: ScheduleEntry): "ready" | "warn" | "neutral" | "accent" {
  if (e.status === "done") return "ready";
  if (e.status === "skipped") return "neutral";
  if (e.kind === "maintenance") return e.overdue ? "warn" : "neutral";
  if (e.kind === "turnover") return "accent";
  return "neutral";
}

function kindLabel(kind: ScheduleEntry["kind"]): string {
  if (kind === "turnover") return "Turnover";
  if (kind === "maintenance") return "Maintenance";
  return "Custom";
}

function statusLabel(e: ScheduleEntry): string {
  if (e.status === "done") return "Done";
  if (e.status === "skipped") return "Skipped";
  if (e.overdue) return "Overdue";
  return "Scheduled";
}

function Chip({
  entry,
  showProperty,
  onClick,
}: {
  entry: ScheduleEntry;
  showProperty: boolean;
  onClick: () => void;
}) {
  const tone = chipTone(entry);
  const skipped = entry.status === "skipped";
  return (
    <button
      type="button"
      className={`chip spill ${tone}${skipped ? " skipped" : ""}`}
      onClick={(ev) => {
        ev.stopPropagation();
        onClick();
      }}
    >
      <span>{entry.title}</span>
      {showProperty && (
        <span className="chip-prop">{entry.propertyName}</span>
      )}
    </button>
  );
}

export function ScheduleClient({
  entries,
  properties,
  members,
  canEdit,
  today,
}: {
  entries: ScheduleEntry[];
  properties: PropertyLite[];
  members: MemberLite[];
  canEdit: boolean;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(today);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<
    | { kind: "add"; date: string }
    | { kind: "detail"; entry: ScheduleEntry }
    | { kind: "day"; date: string }
    | null
  >(null);

  const visible =
    filter === "all" ? entries : entries.filter((e) => e.propertyId === filter);
  const byDay = bucketByDay(visible);
  const gridDays =
    view === "week"
      ? weekDays(anchor).map((date) => ({ date, outside: false }))
      : monthGrid(anchor);
  const timeline = upcoming(visible, today, 8);
  const showProperty = filter === "all";

  function goPrev() {
    setAnchor((a) =>
      view === "week" ? addDays(a, -7) : shiftMonth(a, -1)
    );
  }
  function goNext() {
    setAnchor((a) => (view === "week" ? addDays(a, 7) : shiftMonth(a, 1)));
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else {
        setOpen(null);
        router.refresh();
      }
    });
  }

  function orgIdFor(propertyId: string): string {
    return properties.find((p) => p.id === propertyId)?.orgId ?? "";
  }

  return (
    <div className="stack">
      {error && <Note variant="warn">{error}</Note>}

      <Card className="pad stack">
        <div className="spread" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="row" style={{ gap: 6 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goPrev}
              aria-label="Previous period"
            >
              ‹
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAnchor(today)}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={goNext}
              aria-label="Next period"
            >
              ›
            </Button>
            <span style={{ fontWeight: 600, marginLeft: 8 }}>
              {periodLabel(view, anchor, gridDays)}
            </span>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="row" style={{ gap: 4 }}>
              <Button
                type="button"
                variant={view === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("week")}
              >
                Week
              </Button>
              <Button
                type="button"
                variant={view === "month" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("month")}
              >
                Month
              </Button>
            </div>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by property"
            >
              <option value="all">All tubs</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {view === "month" && (
          <div className="cal-grid" style={{ marginTop: 12 }}>
            {DOW.map((d) => (
              <div key={d} className="cal-dow" style={{ textAlign: "center" }}>
                {d}
              </div>
            ))}
          </div>
        )}

        <div className="cal-grid" style={{ marginTop: view === "month" ? 4 : 12 }}>
          {gridDays.map(({ date, outside }) => {
            const dayEntries = byDay.get(date) ?? [];
            const isToday = date === today;
            const maxChips = view === "month" ? 3 : dayEntries.length;
            const shown = dayEntries.slice(0, maxChips);
            const more = dayEntries.length - shown.length;

            return (
              <div
                key={date}
                className={`cal-cell${outside ? " outside" : ""}${isToday ? " today" : ""}`}
                onClick={() => {
                  if (canEdit) setOpen({ kind: "add", date });
                }}
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onKeyDown={(e) => {
                  if (canEdit && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setOpen({ kind: "add", date });
                  }
                }}
              >
                <div className="row spread">
                  {view === "week" && (
                    <span className="cal-dow">{weekday(date)}</span>
                  )}
                  <span className="cal-daynum">{dayNum(date)}</span>
                </div>
                {shown.map((entry) => (
                  <Chip
                    key={`${entry.id ?? "v"}-${entry.date}-${entry.title}-${entry.propertyId}`}
                    entry={entry}
                    showProperty={showProperty}
                    onClick={() => setOpen({ kind: "detail", entry })}
                  />
                ))}
                {more > 0 && (
                  <button
                    type="button"
                    className="chip spill neutral"
                    style={{ fontSize: 10 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen({ kind: "day", date });
                    }}
                  >
                    +{more} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {open?.kind === "add" && canEdit && (
        <AddPanel
          date={open.date}
          properties={properties}
          pending={isPending}
          onClose={() => setOpen(null)}
          onSubmit={(input) =>
            runAction(() =>
              createScheduledItemAction({
                propertyId: input.propertyId,
                orgId: orgIdFor(input.propertyId),
                kind: input.kind,
                title: input.title,
                scheduledFor: input.date,
                notes: input.notes,
              })
            )
          }
        />
      )}

      {open?.kind === "detail" && (
        <DetailPanel
          entry={open.entry}
          members={members}
          canEdit={canEdit}
          pending={isPending}
          onClose={() => setOpen(null)}
          onEdit={(title, notes) =>
            runAction(() =>
              editScheduledItemAction(open.entry.id!, { title, notes })
            )
          }
          onReschedule={(date) =>
            runAction(() => rescheduleScheduledItemAction(open.entry.id!, date))
          }
          onAssign={(userId) =>
            runAction(() => assignScheduledItemAction(open.entry.id!, userId))
          }
          onDone={(note) =>
            runAction(() =>
              markScheduledItemDoneAction({
                id: open.entry.id!,
                maintenanceTaskId: open.entry.maintenanceTaskId,
                propertyId: open.entry.propertyId,
                note,
              })
            )
          }
          onSkip={() =>
            runAction(() => skipScheduledItemAction(open.entry.id!))
          }
          onCompleteVirtual={(note) =>
            runAction(() =>
              completeMaintenanceOccurrenceAction({
                maintenanceTaskId: open.entry.maintenanceTaskId!,
                propertyId: open.entry.propertyId,
                orgId: orgIdFor(open.entry.propertyId),
                title: open.entry.title,
                scheduledFor: open.entry.date,
                note,
              })
            )
          }
          onScheduleVirtual={() =>
            runAction(() =>
              createScheduledItemAction({
                propertyId: open.entry.propertyId,
                orgId: orgIdFor(open.entry.propertyId),
                kind: "maintenance",
                title: open.entry.title,
                scheduledFor: open.entry.date,
                maintenanceTaskId: open.entry.maintenanceTaskId,
                source: "auto",
              })
            )
          }
        />
      )}

      {open?.kind === "day" && (
        <DayPanel
          date={open.date}
          entries={byDay.get(open.date) ?? []}
          showProperty={showProperty}
          onClose={() => setOpen(null)}
          onSelect={(entry) => setOpen({ kind: "detail", entry })}
        />
      )}

      <Card className="pad stack">
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Upcoming work</h2>
        {timeline.length === 0 ? (
          <p className="muted">Nothing scheduled ahead.</p>
        ) : (
          <div className="stack" style={{ gap: 0 }}>
            {timeline.map((entry) => (
              <button
                key={`${entry.id ?? "v"}-${entry.date}-${entry.title}-${entry.propertyId}`}
                type="button"
                className="drow2"
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 2px",
                }}
                onClick={() => setOpen({ kind: "detail", entry })}
              >
                <span className="when">
                  <b>{entry.date}</b>
                  <span className="who">
                    {" · "}
                    {entry.propertyName} · {entry.title} · {kindLabel(entry.kind)}
                    {entry.assigneeName ? ` · ${entry.assigneeName}` : ""}
                    {" · "}
                    {statusLabel(entry)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AddPanel({
  date,
  properties,
  pending,
  onClose,
  onSubmit,
}: {
  date: string;
  properties: PropertyLite[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: {
    kind: "turnover" | "custom";
    propertyId: string;
    title: string;
    date: string;
    notes: string | null;
  }) => void;
}) {
  const [kind, setKind] = useState<"turnover" | "custom">("custom");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(date);
  const [notes, setNotes] = useState("");

  return (
    <Card className="pad stack">
      <div className="spread">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add scheduled work</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            kind,
            propertyId,
            title,
            date: scheduledDate,
            notes: notes.trim() || null,
          });
        }}
      >
        <div>
          <Label htmlFor="add-kind">Kind</Label>
          <Select
            id="add-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "turnover" | "custom")}
          >
            <option value="turnover">Turnover</option>
            <option value="custom">Custom</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="add-property">Property</Label>
          <Select
            id="add-property"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="add-title">Title</Label>
          <Input
            id="add-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="add-date">Date</Label>
          <Input
            id="add-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="add-notes">Notes</Label>
          <Textarea
            id="add-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <div className="row">
          <Button type="submit" disabled={pending || !title.trim() || !propertyId}>
            {pending ? "Saving…" : "Add"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function DetailPanel({
  entry,
  members,
  canEdit,
  pending,
  onClose,
  onEdit,
  onReschedule,
  onAssign,
  onDone,
  onSkip,
  onCompleteVirtual,
  onScheduleVirtual,
}: {
  entry: ScheduleEntry;
  members: MemberLite[];
  canEdit: boolean;
  pending: boolean;
  onClose: () => void;
  onEdit: (title: string, notes: string | null) => void;
  onReschedule: (date: string) => void;
  onAssign: (userId: string | null) => void;
  onDone: (note: string | null) => void;
  onSkip: () => void;
  onCompleteVirtual: (note: string | null) => void;
  onScheduleVirtual: () => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [rescheduleDate, setRescheduleDate] = useState(entry.date);
  const [assignee, setAssignee] = useState(entry.assigneeUserId ?? "");
  const [doneNote, setDoneNote] = useState("");

  const isVirtual = entry.virtual && entry.kind === "maintenance";
  const isPersisted = entry.id != null;

  return (
    <Card className="pad stack">
      <div className="spread">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{entry.title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {entry.propertyName} · {entry.date} · {kindLabel(entry.kind)} ·{" "}
        {statusLabel(entry)}
        {entry.assigneeName ? ` · ${entry.assigneeName}` : ""}
      </p>

      {canEdit && isPersisted && (
        <div className="stack">
          <div>
            <Label htmlFor="detail-title">Title</Label>
            <Input
              id="detail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="detail-notes">Notes</Label>
            <Textarea
              id="detail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => onEdit(title, notes.trim() || null)}
          >
            Save changes
          </Button>
          <div>
            <Label htmlFor="detail-date">Reschedule</Label>
            <div className="row">
              <Input
                id="detail-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => onReschedule(rescheduleDate)}
              >
                Move
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="detail-assignee">Assignee</Label>
            <div className="row">
              <Select
                id="detail-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => onAssign(assignee || null)}
              >
                Assign
              </Button>
            </div>
          </div>
          {entry.status === "scheduled" && (
            <>
              <div>
                <Label htmlFor="detail-done-note">Completion note</Label>
                <Input
                  id="detail-done-note"
                  value={doneNote}
                  onChange={(e) => setDoneNote(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="row">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => onDone(doneNote.trim() || null)}
                >
                  Mark done
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={onSkip}
                >
                  Skip
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {canEdit && isVirtual && (
        <div className="stack">
          <div>
            <Label htmlFor="virtual-done-note">Completion note</Label>
            <Input
              id="virtual-done-note"
              value={doneNote}
              onChange={(e) => setDoneNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="row">
            <Button
              type="button"
              disabled={pending}
              onClick={() => onCompleteVirtual(doneNote.trim() || null)}
            >
              Mark done
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onScheduleVirtual}
            >
              Schedule it
            </Button>
          </div>
        </div>
      )}

      {!canEdit && entry.notes && (
        <p className="muted" style={{ margin: 0 }}>
          Notes: {entry.notes}
        </p>
      )}
    </Card>
  );
}

function DayPanel({
  date,
  entries,
  showProperty,
  onClose,
  onSelect,
}: {
  date: string;
  entries: ScheduleEntry[];
  showProperty: boolean;
  onClose: () => void;
  onSelect: (entry: ScheduleEntry) => void;
}) {
  return (
    <Card className="pad stack">
      <div className="spread">
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
          {date} · {entries.length} item{entries.length === 1 ? "" : "s"}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="stack">
        {entries.map((entry) => (
          <Chip
            key={`${entry.id ?? "v"}-${entry.date}-${entry.title}-${entry.propertyId}`}
            entry={entry}
            showProperty={showProperty}
            onClick={() => onSelect(entry)}
          />
        ))}
      </div>
    </Card>
  );
}
