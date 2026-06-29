"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea, Note } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import {
  EQUIPMENT_TYPES,
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
  const [editingId, setEditingId] = useState<string | null>(null);

  function saveOrgNote() {
    setError(null);
    startTransition(async () => {
      const res = await saveOrgNoteAction(orgId, noteDraft);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function addItem(group: PropertyEquipment, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await createEquipmentAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function updateItem(equipmentId: string, group: PropertyEquipment, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await updateEquipmentAction(equipmentId, fd);
      if (!res.ok) setError(res.error);
      else {
        setEditingId(null);
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

      {groups.length === 0 ? (
        <Card className="pad">
          <p className="muted">No properties yet.</p>
        </Card>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="stack" style={{ gap: 8 }}>
            <h2 className="small" style={{ margin: 0 }}>
              {g.name}
            </h2>
            {g.items.length === 0 ? (
              <Card className="pad">
                <p className="muted small">No equipment recorded.</p>
              </Card>
            ) : (
              <div className="dlist">
                {g.items.map((item) => (
                  <div key={item.id}>
                    <div className="drow2">
                      <div className="nmwrap">
                        <span className="nm">{equipmentTypeLabel(item.type as EquipmentType)}</span>
                        {item.makeModel && (
                          <span className="small muted" style={{ display: "block" }}>
                            {item.makeModel}
                          </span>
                        )}
                      </div>
                      <span className="when">
                        {item.installedAt
                          ? `Installed ${formatDateOnly(item.installedAt)}`
                          : "—"}
                      </span>
                      <div className="badges">
                        {(() => {
                          const label = warrantyLabel(item.warrantyUntil, today);
                          const tone = warrantyTone(item.warrantyUntil, today);
                          if (!label || !tone) return null;
                          return <span className={`spill ${tone}`}>{label}</span>;
                        })()}
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
                              onClick={() =>
                                setEditingId(editingId === item.id ? null : item.id)
                              }
                            >
                              Edit
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
                    {item.notes && editingId !== item.id && (
                      <div className="pad" style={{ paddingTop: 0 }}>
                        <p className="small muted" style={{ margin: 0 }}>
                          {item.notes}
                        </p>
                      </div>
                    )}
                    {canEdit && editingId === item.id && (
                      <EquipmentForm
                        initial={item}
                        pending={isPending}
                        onSubmit={(fd) => updateItem(item.id, g, fd)}
                        onCancel={() => setEditingId(null)}
                        submitLabel="Save changes"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && (
              <AddEquipmentForm group={g} onAdd={addItem} pending={isPending} />
            )}
          </div>
        ))
      )}
    </div>
  );
}

function EquipmentForm({
  initial,
  pending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: EquipmentRow;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [type, setType] = useState<EquipmentType>(
    (initial?.type as EquipmentType) ?? "pump"
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
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        + Add equipment
      </Button>
    );
  }

  return (
    <EquipmentForm
      pending={pending}
      submitLabel="Add equipment"
      onSubmit={(fd) => {
        onAdd(group, fd);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
