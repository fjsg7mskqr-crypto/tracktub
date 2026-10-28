"use client";

import { useActionState, useState } from "react";
import { addPersonAction, type AddPersonState } from "@/lib/actions/people";
import { AccessPicker } from "./AccessPicker";
import { InviteLink } from "./InviteLink";
import { card, errorText, muted, primaryButton, quietButton } from "./styles";

const initial: AddPersonState = { error: null, link: null };

/**
 * Admin only. A quiet "Add person" until tapped (most accounts never add
 * anyone), then email + property access → a one-time invite link.
 */
export function AddPerson({
  properties,
}: {
  properties: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(addPersonAction, initial);

  if (!open)
    return (
      <button
        type="button"
        style={{ ...quietButton, alignSelf: "flex-start" }}
        onClick={() => setOpen(true)}
      >
        Add person
      </button>
    );

  if (state.link)
    return (
      <section style={card} aria-label="Invite link">
        <p style={{ margin: 0, fontSize: 16 }}>
          Send this link to {email.trim()}. It works once and expires in 14
          days.
        </p>
        <InviteLink url={state.link} />
      </section>
    );

  return (
    <form action={action} style={card} aria-label="Add person">
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 14, color: "var(--tt-text-2)" }}>Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            height: 48,
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            background: "var(--tt-raised)",
            color: "var(--tt-text)",
            padding: "0 14px",
            fontSize: 16,
          }}
        />
      </label>
      <AccessPicker properties={properties} />
      <p style={muted}>They can see tubs, run visits and send records.</p>
      {state.error && (
        <p role="alert" style={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" style={primaryButton} disabled={pending}>
        {pending ? "Creating…" : "Create invite link"}
      </button>
      <button type="button" style={quietButton} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
