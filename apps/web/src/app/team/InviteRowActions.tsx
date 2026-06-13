"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, CopyField } from "@/components/ui";
import { resendInviteAction, revokeInviteAction } from "@/lib/actions/invite";

// Resend (regenerate token + show the fresh link) / Revoke for a pending invite.
export function InviteRowActions({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  function resend() {
    startTransition(async () => {
      const res = await resendInviteAction(inviteId);
      if (res.ok) setLink(`${window.location.origin}/invite/${res.token}`);
    });
  }

  function revoke() {
    startTransition(async () => {
      await revokeInviteAction(inviteId);
      router.refresh();
    });
  }

  if (link) {
    return <CopyField value={link} />;
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={resend} disabled={pending}>
        Resend
      </Button>
      <Button size="sm" variant="ghost" onClick={revoke} disabled={pending}>
        Revoke
      </Button>
    </>
  );
}
