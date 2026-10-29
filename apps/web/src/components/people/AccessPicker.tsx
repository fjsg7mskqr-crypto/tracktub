"use client";

import { useState } from "react";

/**
 * "All properties" switch (on by default for a new login) and, when off, the
 * property checkboxes. Posts `all` and repeated `property` — see parseAccess.
 */
export function AccessPicker({
  properties,
  allProperties = true,
  selected = [],
}: {
  properties: { id: string; name: string }[];
  allProperties?: boolean;
  selected?: string[];
}) {
  const [all, setAll] = useState(allProperties);

  return (
    <fieldset
      style={{
        border: 0,
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <legend style={{ padding: 0, fontSize: 14, color: "var(--tt-text-2)" }}>
        Properties they see
      </legend>
      <label style={row}>
        <input
          type="checkbox"
          name="all"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
          style={box}
        />
        All properties
      </label>
      {!all &&
        (properties.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-3)" }}>
            No properties yet.
          </p>
        ) : (
          properties.map((p) => (
            <label key={p.id} style={{ ...row, paddingLeft: 30 }}>
              <input
                type="checkbox"
                name="property"
                value={p.id}
                defaultChecked={selected.includes(p.id)}
                style={box}
              />
              {p.name}
            </label>
          ))
        ))}
    </fieldset>
  );
}

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: "var(--tt-tap)",
  fontSize: 16,
};

const box: React.CSSProperties = {
  width: 20,
  height: 20,
  accentColor: "var(--tt-action)",
};
