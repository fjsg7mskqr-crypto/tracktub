"use client";

import { useState } from "react";
import { copyText } from "@/lib/copy-text";
import { quietButton } from "./styles";

/** Share sheet + copy for an invite link; without a share sheet, Share copies. */
export function InviteLink({
  url,
  showUrl = true,
}: {
  url: string;
  showUrl?: boolean;
}) {
  const [toast, setToast] = useState<string | null>(null);

  async function copy() {
    setToast(
      (await copyText(url))
        ? "Link copied"
        : "Couldn't copy — press and hold the link"
    );
  }

  async function share() {
    if (typeof navigator.share !== "function") return copy();
    try {
      await navigator.share({ title: "Join TrackTub", url });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copy();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {showUrl && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "var(--tt-text-2)",
            overflowWrap: "anywhere",
            userSelect: "all",
          }}
        >
          {url}
        </p>
      )}
      <div style={{ display: "flex", gap: 16 }}>
        <button type="button" style={quietButton} onClick={share}>
          Share
        </button>
        <button type="button" style={quietButton} onClick={copy}>
          Copy link
        </button>
      </div>
      {toast && (
        <p
          role="status"
          style={{ margin: 0, fontSize: 14, color: "var(--tt-text-2)" }}
        >
          {toast}
        </p>
      )}
    </div>
  );
}
