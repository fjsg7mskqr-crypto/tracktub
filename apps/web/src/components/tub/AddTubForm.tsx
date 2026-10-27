"use client";

import { useActionState, useState } from "react";
import { NEW_CLIENT } from "@/components/tub/add-tub";
import { createTubAction, type AddTubState } from "@/app/tubs/new/actions";

const field: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: "var(--tt-text-2)",
};

const control: React.CSSProperties = {
  minHeight: "var(--tt-tap)",
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "var(--tt-surface)",
  color: "var(--tt-text)",
  fontSize: 16, // ≥16px stops iOS zooming on focus
  fontFamily: "inherit",
  fontWeight: 400,
};

/** Add tub: name, client (pick or create), address (spec §4). */
export function AddTubForm({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<AddTubState, FormData>(
    createTubAction,
    { error: null }
  );
  const [client, setClient] = useState(
    clients.length > 0 ? clients[0].id : NEW_CLIENT
  );

  return (
    <form
      action={action}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <label style={field}>
        Name
        <input
          name="name"
          required
          autoComplete="off"
          placeholder="Cedar Cabin"
          style={control}
        />
      </label>

      <label style={field}>
        Client
        <select
          name="client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          style={control}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_CLIENT}>New client…</option>
        </select>
      </label>

      {client === NEW_CLIENT && (
        <label style={field}>
          New client name
          <input
            name="new_client"
            required
            autoComplete="off"
            placeholder="Lakeview Rentals"
            style={control}
          />
        </label>
      )}

      <label style={field}>
        Address
        <input
          name="address"
          autoComplete="street-address"
          placeholder="412 Shore Rd"
          style={control}
        />
      </label>

      {state.error && (
        <p role="alert" style={{ margin: 0, color: "var(--tt-due-text)" }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          height: 52,
          border: 0,
          borderRadius: 999,
          background: "var(--tt-action)",
          color: "#FFFFFF",
          fontSize: 17,
          fontWeight: 600,
          fontFamily: "inherit",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Adding…" : "Add tub"}
      </button>
    </form>
  );
}
