import {
  EQUIPMENT_TYPES,
  equipmentTypeLabel,
  formatDateOnly,
  warrantyLabel,
  warrantyTone,
  type EquipmentType,
} from "@/lib/equipment";

export interface EquipmentPartRow {
  id: string;
  type: string;
  makeModel: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
}

function orderedParts(items: EquipmentPartRow[]): EquipmentPartRow[] {
  const rank = (t: string) => {
    const i = EQUIPMENT_TYPES.findIndex((e) => e.value === t);
    return i === -1 ? EQUIPMENT_TYPES.length : i;
  };
  return [...items].sort((a, b) => rank(a.type) - rank(b.type));
}

/** Read-only equipment reference for maintenance / repair context (issue #227). */
export function EquipmentPartsList({
  items,
  today,
}: {
  items: EquipmentPartRow[];
  today: string;
}) {
  if (items.length === 0) return null;

  const parts = orderedParts(items);

  return (
    <div className="card pad stack" style={{ gap: 8 }}>
      <p className="small muted" style={{ margin: 0 }}>
        Parts on this tub
      </p>
      <div className="dlist">
        {parts.map((item) => {
          const label = warrantyLabel(item.warrantyUntil, today);
          const tone = warrantyTone(item.warrantyUntil, today);
          return (
            <div key={item.id} className="drow2">
              <div className="nmwrap">
                <span className="nm">{equipmentTypeLabel(item.type as EquipmentType)}</span>
                <span className="small muted" style={{ display: "block" }}>
                  {item.makeModel || "—"}
                </span>
              </div>
              <span className="when">
                {item.installedAt ? `Installed ${formatDateOnly(item.installedAt)}` : "—"}
              </span>
              <div className="badges">
                {label && tone && <span className={`spill ${tone}`}>{label}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
