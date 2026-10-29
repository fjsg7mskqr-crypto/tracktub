"use client";

import { useState, useTransition } from "react";
import { removePersonAction } from "@/lib/actions/people";
import { dangerButton, errorText, quietButton } from "./styles";

/** Admin only: remove a login, after an inline confirm. */
export function RemovePerson({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming)
    return (
      <button
        type="button"
        style={dangerButton}
        onClick={() => setConfirming(true)}
      >
        Remove
      </button>
    );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
      }}
    >
      <p style={{ margin: 0, fontSize: 15 }}>
        Remove {name}? They lose access right away.
      </p>
      <div style={{ display: "flex", gap: 16 }}>
        <button
          type="button"
          style={dangerButton}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await removePersonAction(userId);
              if (res.error) setError(res.error);
            })
          }
        >
          {pending ? "Removing…" : "Remove"}
        </button>
        <button
          type="button"
          style={quietButton}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" style={errorText}>
          {error}
        </p>
      )}
    </div>
  );
}
