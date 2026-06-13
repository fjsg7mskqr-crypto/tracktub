"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { acceptInviteAction } from "@/lib/actions/invite";

// Signed-in accept CTA. On success the server action redirects to "/"; only an
// error path returns here.
export function AcceptButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="stack" style={{ gap: 8 }}>
      <Button
        variant="primary"
        block
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await acceptInviteAction(token);
            if (res?.error) setError(res.error);
          });
        }}
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
      {error && (
        <p className="small" style={{ color: "var(--urgent)", margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
