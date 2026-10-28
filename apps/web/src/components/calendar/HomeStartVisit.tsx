"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startVisit } from "@/lib/actions/visit";
import { visitPath } from "@/lib/app-routes";

const pill: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 76,
  height: "var(--tt-tap)",
  padding: "0 14px",
  border: 0,
  borderRadius: 999,
  background: "var(--tt-action)",
  color: "#FFFFFF",
  fontFamily: "inherit",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
  flex: "none",
};

/**
 * Compact Start visit for a Needs-attention row (Lane 2's `startVisit`; a
 * second tap resumes the same draft). Continue when a draft is already open.
 */
export function HomeStartVisit({
  tubId,
  tubName,
  draftId,
}: {
  tubId: string;
  tubName: string;
  draftId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  if (draftId)
    return (
      <Link
        href={visitPath(draftId)}
        aria-label={`Continue visit at ${tubName}`}
        style={pill}
      >
        Continue
      </Link>
    );

  return (
    <button
      type="button"
      aria-label={
        failed
          ? `Couldn't start — try again at ${tubName}`
          : `Start visit at ${tubName}`
      }
      disabled={pending}
      onClick={() => {
        setFailed(false);
        startTransition(async () => {
          try {
            const { visitId } = await startVisit(tubId);
            router.push(visitPath(visitId));
          } catch {
            setFailed(true);
          }
        });
      }}
      style={{ ...pill, opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "…" : failed ? "Retry" : "Start"}
    </button>
  );
}
