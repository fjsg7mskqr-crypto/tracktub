"use client";

import { useState, useTransition } from "react";
import { revokeInviteAction } from "@/lib/actions/invite";
import { dangerButton, errorText } from "./styles";

/** Admin only: cancel an invite link nobody has used yet. */
export function CancelInvite({ inviteId }: { inviteId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        style={dangerButton}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await revokeInviteAction(inviteId);
            if (!res.ok) setError("Couldn't cancel the invite. Try again.");
          })
        }
      >
        Cancel invite
      </button>
      {error && (
        <p role="alert" style={errorText}>
          {error}
        </p>
      )}
    </>
  );
}
