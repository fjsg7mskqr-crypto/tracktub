"use client";

import { useState } from "react";
import { recordProofShare } from "@/lib/actions/proofEvent";

/**
 * Copy without the Clipboard API, which is missing outside a secure context
 * (e.g. the phone hitting a LAN dev server over http). A temporary readonly
 * textarea + execCommand("copy") still works there, iOS Safari included.
 */
function legacyCopy(text: string): boolean {
  const el = document.createElement("textarea");
  el.value = text;
  el.readOnly = true;
  el.style.position = "fixed";
  el.style.top = "0";
  el.style.opacity = "0";
  document.body.appendChild(el);
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    el.remove();
  }
}

async function copyText(text: string): Promise<boolean> {
  if (typeof navigator.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy copy.
    }
  }
  return legacyCopy(text);
}

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
    if (await copyText(link)) {
      void recordProofShare(turnoverId);
      setToast("Link copied");
    } else {
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
