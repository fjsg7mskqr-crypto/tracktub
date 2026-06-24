"use client";

import { useState, useTransition } from "react";
import { Label, Select } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { updatePropertySanitizerTypeAction } from "@/lib/actions/property";
import {
  SANITIZER_BANDS,
  sanitizerLabel,
  type SanitizerType,
} from "@/lib/chemistry";

/** Per-property settings (#178). Today: the sanitizer type, which drives the
 *  readings-panel label and the target band. Only shown to operators/staff who
 *  can manage the property; saves on change. */
export function PropertySettings({
  propertyId,
  sanitizerType,
  canManage,
}: {
  propertyId: string;
  sanitizerType: SanitizerType;
  canManage: boolean;
}) {
  const [value, setValue] = useState<SanitizerType>(sanitizerType);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canManage) return null;

  function save(next: SanitizerType) {
    const prev = value;
    setValue(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updatePropertySanitizerTypeAction(propertyId, next);
      if (result.ok) {
        setSaved(true);
      } else {
        setValue(prev);
        setError(result.error);
      }
    });
  }

  const band = SANITIZER_BANDS[value];

  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>Settings</h3>
        <span className="badge">
          <Icon name="droplet" size={12} /> Sanitizer
        </span>
      </div>
      <div style={{ maxWidth: 320 }}>
        <Label eyebrow htmlFor="san-type">
          Sanitizer type
        </Label>
        <Select
          id="san-type"
          value={value}
          disabled={isPending}
          onChange={(e) => save(e.target.value as SanitizerType)}
        >
          <option value="chlorine">
            Chlorine ({SANITIZER_BANDS.chlorine.min}–
            {SANITIZER_BANDS.chlorine.max} ppm)
          </option>
          <option value="bromine">
            Bromine ({SANITIZER_BANDS.bromine.min}–{SANITIZER_BANDS.bromine.max}{" "}
            ppm)
          </option>
        </Select>
        <div className="tiny dim" style={{ marginTop: 4 }}>
          Readings flag {sanitizerLabel(value)} against {band.min}–{band.max} ppm.
        </div>
        {error && (
          <p className="tiny" style={{ color: "var(--urgent)", margin: "6px 0 0" }}>
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="tiny" style={{ color: "var(--verified)", margin: "6px 0 0" }}>
            Saved.
          </p>
        )}
      </div>
    </div>
  );
}
