"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea, Note } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import {
  EQUIPMENT_TYPES,
  CHECKLIST_TYPES,
  equipmentTypeLabel,
  formatDateOnly,
  warrantyLabel,
  warrantyTone,
  type EquipmentType,
} from "@/lib/equipment";
import {
  createEquipmentAction,
  updateEquipmentAction,
  archiveEquipmentAction,
  saveOrgNoteAction,
} from "@/lib/actions/equipment";

export interface EquipmentRow {
  id: string;
  type: string;
  makeModel: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  notes: string | null;
}

export interface PropertyEquipment {
  id: string;
  name: string;
  orgId: string;
  items: EquipmentRow[];
}

/** Order a property's items by the standard checklist order, then extras/Other. */
function orderedItems(items: EquipmentRow[]): EquipmentRow[] {
  const rank = (t: string) => {
    const i = EQUIPMENT_TYPES.findIndex((e) => e.value === t);
    return i === -1 ? EQUIPMENT_TYPES.length : i;
  };
  return [...items].sort((a, b) => rank(a.type) - rank(b.type));
}

export function EquipmentClient({
  groups,
  canEdit,
  orgId,
  orgNoteBody,
  orgNoteUpdatedAt,
  today,
}: {
  groups: PropertyEquipment[];
  canEdit: boolean;
  orgId: string;
  orgNoteBody: string | null;
  orgNoteUpdatedAt: string | null;
  today: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState(orgNoteBody ?? "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function saveOrgNote() {
    setError(null);
    startTransition(async () => {
      const res = await saveOrgNoteAction(orgId, noteDraft);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  /** Insert an equipment row, then drill into the new card. */
  function runCreate(group: PropertyEquipment, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await createEquipmentAction(fd);
      if (!res.ok) setError(res.error);
      else {
        setExpanded((prev) => new Set(prev).add(res.id));
        router.refresh();
      }
    });
  }

  /** Create a bare row of `type` (empty detail) and open it for drill-in. */
  function createItem(group: PropertyEquipment, type: EquipmentType) {
    const fd = new FormData();
    fd.append("type", type);
    runCreate(group, fd);
  }

  /**
   * Checklist chip tap. Off → create the row (fast "it's on this tub" pass) and
   * drill in. On → jump to / expand its card. Removal lives in the card's
   * Archive, never a chip tap, so drilled-in detail can't be lost by accident.
   */
  function toggleType(group: PropertyEquipment, type: EquipmentType) {
    const present = group.items.filter((i) => i.type === type);
    if (present.length === 0) {
      createItem(group, type);
      return;
    }
    toggleExpand(present[0].id);
  }

  function updateItem(equipmentId: string, group: PropertyEquipment, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await updateEquipmentAction(equipmentId, fd);
      if (!res.ok) setError(res.error);
      else {
        setExpanded((prev) => {
          const next = new Set(prev);
          next.delete(equipmentId);
          return next;
        });
        router.refresh();
      }
    });
  }

  function archive(equipmentId: string) {
    setError(null);
    startTransition(async () => {
      const res = await archiveEquipmentAction(equipmentId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      {error && <Note variant="warn">{error}</Note>}

      {groups.length === 0 ? (
        <Card className="pad">
          <p className="muted">No properties yet.</p>
        </Card>
      ) : (
        groups.map((g) => {
          const items = orderedItems(g.items);
          return (
            <div key={g.id} className="stack" style={{ gap: 10 }}>
              <h2 className="small" style={{ margin: 0 }}>
                {g.name}
              </h2>

              {/* Checklist: the fast "what's on this tub" pass. */}
              <div className="row wrap" style={{ gap: 8 }}>
                {CHECKLIST_TYPES.map((t) => {
                  const on = g.items.some((i) => i.type === t.value);
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className="btn ghost sm"
                      aria-pressed={on}
                      disabled={!canEdit || isPending}
                      onClick={() => toggleType(g, t.value)}
                      style={{
                        borderColor: on ? "var(--brand-blue-line)" : "var(--border)",
                        background: on ? "var(--brand-blue-dim)" : "transparent",
                        color: on ? "var(--text-hi)" : "var(--text-lo)",
                      }}
                    >
                      {on ? "✓ " : ""}
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {items.length > 0 && (
                <div className="dlist">
                  {items.map((item) => {
                    const isOpen = expanded.has(item.id);
                    const label = warrantyLabel(item.warrantyUntil, today);
                    const tone = warrantyTone(item.warrantyUntil, today);
                    return (
                      <div key={item.id}>
                        <div className="drow2">
                          <button
                            type="button"
                            className="nmwrap"
                            onClick={() => toggleExpand(item.id)}
                            aria-expanded={isOpen}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                              font: "inherit",
                              color: "inherit",
                            }}
                          >
                            <span className="nm">
                              {equipmentTypeLabel(item.type as EquipmentType)}
                            </span>
                            <span className="small muted" style={{ display: "block" }}>
                              {item.makeModel || "No details yet — tap to add"}
                            </span>
                          </button>
                          <span className="when">
                            {item.installedAt
                              ? `Installed ${formatDateOnly(item.installedAt)}`
                              : "—"}
                          </span>
                          <div className="badges">
                            {label && tone && <span className={`spill ${tone}`}>{label}</span>}
                            {item.notes && (
                              <span className="small muted" title={item.notes}>
                                Notes
                              </span>
                            )}
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  {isOpen ? "Close" : "Edit"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => archive(item.id)}
                                >
                                  Archive
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        {isOpen &&
                          (canEdit ? (
                            <EquipmentForm
                              initial={item}
                              showType={item.type === "other"}
                              pending={isPending}
                              onSubmit={(fd) => updateItem(item.id, g, fd)}
                              onCancel={() => toggleExpand(item.id)}
                              submitLabel="Save changes"
                            />
                          ) : (
                            item.notes && (
                              <div className="pad" style={{ paddingTop: 0 }}>
                                <p className="small muted" style={{ margin: 0 }}>
                                  {item.notes}
                                </p>
                              </div>
                            )
                          ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {canEdit && <AddEquipmentForm group={g} onAdd={runCreate} pending={isPending} />}
            </div>
          );
        })
      )}

      {/* Org-wide reference — kept below the per-property equipment so the tab
          leads with the tubs, not an easy-to-leave-empty notes box. */}
      <Card className="pad stack" style={{ gap: 10 }}>
        <div className="spread">
          <h2 className="small" style={{ margin: 0 }}>
            Shared notes
          </h2>
          {orgNoteUpdatedAt && (
            <span className="small muted">Updated {timeAgo(orgNoteUpdatedAt)}</span>
          )}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Vendor contacts, account numbers, and other org-wide reference info.
        </p>
        <Textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          readOnly={!canEdit}
          rows={4}
          placeholder={canEdit ? "Pool supply account #, cover vendor phone…" : "No notes yet."}
        />
        {canEdit && (
          <div>
            <Button variant="primary" disabled={isPending} onClick={saveOrgNote}>
              Save notes
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function EquipmentForm({
  initial,
  showType = true,
  defaultType = "other",
  pending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: EquipmentRow;
  showType?: boolean;
  defaultType?: EquipmentType;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [type, setType] = useState<EquipmentType>(
    (initial?.type as EquipmentType) ?? defaultType
  );
  const [makeModel, setMakeModel] = useState(initial?.makeModel ?? "");
  const [installedAt, setInstalledAt] = useState(initial?.installedAt ?? "");
  const [warrantyUntil, setWarrantyUntil] = useState(initial?.warrantyUntil ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function submit() {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("make_model", makeModel);
    fd.append("installed_at", installedAt);
    fd.append("warranty_until", warrantyUntil);
    fd.append("notes", notes);
    onSubmit(fd);
  }

  return (
    <Card className="pad stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        {showType && (
          <div className="stack" style={{ gap: 4 }}>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as EquipmentType)}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="stack" style={{ gap: 4, flex: 1, minWidth: 160 }}>
          <Label>Make / model</Label>
          <Input
            value={makeModel}
            onChange={(e) => setMakeModel(e.target.value)}
            placeholder="Balboa BP6013G1"
          />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Installed</Label>
          <Input
            type="date"
            value={installedAt}
            onChange={(e) => setInstalledAt(e.target.value)}
          />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Warranty until</Label>
          <Input
            type="date"
            value={warrantyUntil}
            onChange={(e) => setWarrantyUntil(e.target.value)}
          />
        </div>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Serial #, vendor, quirks…"
        />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Button variant="primary" disabled={pending} onClick={submit}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}

function AddEquipmentForm({
  group,
  onAdd,
  pending,
}: {
  group: PropertyEquipment;
  onAdd: (g: PropertyEquipment, fd: FormData) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          + Add other / another
        </Button>
      </div>
    );
  }

  return (
    <EquipmentForm
      pending={pending}
      defaultType="other"
      submitLabel="Add equipment"
      onSubmit={(fd) => {
        onAdd(group, fd);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
