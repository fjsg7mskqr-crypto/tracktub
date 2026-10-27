"use client";

import { useState } from "react";
import { recordProofShare } from "@/lib/actions/proofEvent";

/**
 * Operator-only Send to owner / Copy link (spec §9). Send opens the device
 * share sheet; without one it copies instead. A successful send or copy is
 * what makes the record count as "sent" on Reports (a share_copied
 * proof_event). Cancelling the share sheet records nothing.
 */
export function RecordShareActions({
  turnoverId,
  url,
  tub,
}: {
  turnoverId: string;
  url: string | null;
  tub: string;
}) {
  const [toast, setToast] = useState<string | null>(null);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      void recordProofShare(turnoverId);
      setToast("Link copied");
    } catch {
      setToast("Couldn't copy — press and hold the link below");
    }
  }

  async function send() {
    if (!url) return;
    if (typeof navigator.share !== "function") return copy(url);
    try {
      await navigator.share({ title: `${tub} record`, url });
      void recordProofShare(turnoverId);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copy(url);
    }
  }

  return (
    <>
      <div className="tt-record-actions">
        <button
          type="button"
          className="tt-record-send"
          disabled={!url}
          onClick={send}
        >
          Send to owner
        </button>
        <button
          type="button"
          className="tt-record-copy"
          disabled={!url}
          onClick={() => url && copy(url)}
        >
          Copy link
        </button>
      </div>
      {toast && (
        <p className="tt-record-toast" role="status">
          {toast}
        </p>
      )}
      <p className="tt-record-hint">{url ?? "No link yet."}</p>
    </>
  );
}
