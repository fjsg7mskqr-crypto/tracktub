"use client";

import { useActionState, useState } from "react";
import { updateAccessAction, type ActionState } from "@/lib/actions/people";
import { AccessPicker } from "./AccessPicker";
import { errorText, primaryButton, quietButton } from "./styles";

const initial: ActionState = { error: null, done: false };

/** Admin only: change which properties a login sees. */
export function EditAccess({
  userId,
  properties,
  allProperties,
  selected,
}: {
  userId: string;
  properties: { id: string; name: string }[];
  allProperties: boolean;
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, fd: FormData) => {
      const res = await updateAccessAction(userId, prev, fd);
      if (res.done) setOpen(false);
      return res;
    },
    initial
  );

  if (!open)
    return (
      <button type="button" style={quietButton} onClick={() => setOpen(true)}>
        Edit access
      </button>
    );

  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "100%",
      }}
    >
      <AccessPicker
        properties={properties}
        allProperties={allProperties}
        selected={selected}
      />
      {state.error && (
        <p role="alert" style={errorText}>
          {state.error}
        </p>
      )}
      <button type="submit" style={primaryButton} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" style={quietButton} onClick={() => setOpen(false)}>
        Cancel
      </button>
    </form>
  );
}
