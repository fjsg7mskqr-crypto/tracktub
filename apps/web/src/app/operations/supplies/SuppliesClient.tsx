"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea, Note } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import {
  SUGGESTED_SUPPLIES,
  isLow,
  countLow,
  quantityLabel,
  formatQuantity,
  type Supply,
} from "@/lib/supplies";
import {
  createSupplyAction,
  updateSupplyAction,
  restockSupplyAction,
  archiveSupplyAction,
} from "@/lib/actions/supplies";

export interface PropertySupplies {
  id: string;
  name: string;
  orgId: string;
  items: Supply[];
}

const SUGGEST_LIST_ID = "supply-name-suggestions";

export function SuppliesClient({
  groups,
  canEdit,
}: {
  groups: PropertySupplies[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Set<string>>(new Set());

  function closeEdit(id: string) {
    setEditing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleEdit(id: string) {
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runCreate(group: PropertySupplies, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await createSupplyAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function updateItem(supplyId: string, group: PropertySupplies, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await updateSupplyAction(supplyId, fd);
      if (!res.ok) setError(res.error);
      else {
        closeEdit(supplyId);
        router.refresh();
      }
    });
  }

  function restock(supplyId: string, quantity: number) {
    setError(null);
    startTransition(async () => {
      const res = await restockSupplyAction(supplyId, quantity);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function archive(supplyId: string) {
    setError(null);
    startTransition(async () => {
      const res = await archiveSupplyAction(supplyId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="stack">
      {error && <Note variant="warn">{error}</Note>}

      {/* Suggested consumables — shared across every property's add form. */}
      <datalist id={SUGGEST_LIST_ID}>
        {SUGGESTED_SUPPLIES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {groups.length === 0 ? (
        <Card className="pad">
          <p className="muted">No properties yet.</p>
        </Card>
      ) : (
        groups.map((g) => {
          const lowCount = countLow(g.items);
          return (
            <div key={g.id} className="stack" style={{ gap: 10 }}>
              <div className="spread">
                <h2 className="small" style={{ margin: 0 }}>
                  {g.name}
                </h2>
                {g.items.length > 0 &&
                  (lowCount > 0 ? (
                    <span className="spill warn">
                      {lowCount} low
                    </span>
                  ) : (
                    <span className="small muted">All stocked</span>
                  ))}
              </div>

              {g.items.length > 0 ? (
                <div className="dlist">
                  {g.items.map((item) => {
                    const low = isLow(item);
                    const isEditing = editing.has(item.id);
                    return (
                      <div key={item.id}>
                        <div className="drow2">
                          <div className="nmwrap">
                            <span className="nm">{item.name}</span>
                            <span className="small muted" style={{ display: "block" }}>
                              {quantityLabel(item)}
                              {item.reorderAt != null && (
                                <> · reorder at {formatQuantity(item.reorderAt)}</>
                              )}
                            </span>
                          </div>
                          <span className="when">
                            {item.lastRestockedAt
                              ? `Restocked ${timeAgo(item.lastRestockedAt)}`
                              : "—"}
                          </span>
                          <div className="badges">
                            {low && <span className="spill warn">Low</span>}
                            {item.notes && (
                              <span className="small muted" title={item.notes}>
                                Notes
                              </span>
                            )}
                            {canEdit && (
                              <>
                                <RestockControl
                                  current={item.quantity}
                                  unit={item.unit}
                                  pending={isPending}
                                  onRestock={(q) => restock(item.id, q)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isPending}
                                  onClick={() => toggleEdit(item.id)}
                                >
                                  {isEditing ? "Close" : "Edit"}
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
                        {isEditing && canEdit && (
                          <SupplyForm
                            initial={item}
                            pending={isPending}
                            onSubmit={(fd) => updateItem(item.id, g, fd)}
                            onCancel={() => closeEdit(item.id)}
                            submitLabel="Save changes"
                          />
                        )}
                        {!canEdit && item.notes && (
                          <div className="pad" style={{ paddingTop: 0 }}>
                            <p className="small muted" style={{ margin: 0 }}>
                              {item.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="small muted" style={{ margin: 0 }}>
                  No supplies tracked yet.
                </p>
              )}

              {canEdit && <AddSupplyForm group={g} onAdd={runCreate} pending={isPending} />}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * One-tap restock: reveals a small number input pre-filled with the current
 * quantity, then applies it (stamping today's restock date server-side).
 */
function RestockControl({
  current,
  unit,
  pending,
  onRestock,
}: {
  current: number | null;
  unit: string | null;
  pending: boolean;
  onRestock: (quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current != null ? formatQuantity(current) : "");

  if (!open) {
    return (
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>
        Restock
      </Button>
    );
  }

  function apply() {
    const n = Number(value.trim());
    if (!Number.isFinite(n) || n < 0) return;
    onRestock(n);
    setOpen(false);
  }

  return (
    <span className="row" style={{ gap: 4, alignItems: "center" }}>
      <Input
        type="number"
        min="0"
        step="any"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
          if (e.key === "Escape") setOpen(false);
        }}
        aria-label={unit ? `New quantity (${unit})` : "New quantity"}
        style={{ width: 72 }}
      />
      <Button size="sm" variant="primary" disabled={pending} onClick={apply}>
        Save
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </span>
  );
}

function SupplyForm({
  initial,
  pending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: Supply;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [quantity, setQuantity] = useState(
    initial?.quantity != null ? formatQuantity(initial.quantity) : ""
  );
  const [reorderAt, setReorderAt] = useState(
    initial?.reorderAt != null ? formatQuantity(initial.reorderAt) : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function submit() {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("unit", unit);
    fd.append("quantity", quantity);
    fd.append("reorder_at", reorderAt);
    fd.append("notes", notes);
    onSubmit(fd);
  }

  return (
    <Card className="pad stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 4, flex: 1, minWidth: 180 }}>
          <Label>Name</Label>
          <Input
            value={name}
            list={SUGGEST_LIST_ID}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chlorine granules"
          />
        </div>
        <div className="stack" style={{ gap: 4, width: 100 }}>
          <Label>Unit</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="lb"
          />
        </div>
        <div className="stack" style={{ gap: 4, width: 100 }}>
          <Label>On hand</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="3"
          />
        </div>
        <div className="stack" style={{ gap: 4, width: 100 }}>
          <Label>Reorder at</Label>
          <Input
            type="number"
            min="0"
            step="any"
            value={reorderAt}
            onChange={(e) => setReorderAt(e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Vendor, SKU, storage location…"
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

function AddSupplyForm({
  group,
  onAdd,
  pending,
}: {
  group: PropertySupplies;
  onAdd: (g: PropertySupplies, fd: FormData) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
          + Add supply
        </Button>
      </div>
    );
  }

  return (
    <SupplyForm
      pending={pending}
      submitLabel="Add supply"
      onSubmit={(fd) => {
        onAdd(group, fd);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
  );
}
