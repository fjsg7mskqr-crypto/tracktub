"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { recordProofShare } from "@/lib/actions/proofEvent";
import { track } from "@/lib/analytics";

interface Props {
  shareToken: string | null;
  turnoverId: string;
  turnoverDate: string;
}

export default function ProofActions({ shareToken, turnoverId }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  if (!shareToken) return <p className="small dim">No proof link available.</p>;

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/proof/${shareToken}`
      : `/proof/${shareToken}`;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  function logShare() {
    void recordProofShare(turnoverId);
    track("proof_link_copied", { turnover_id: turnoverId });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      logShare();
      flash("Proof link copied");
    } catch {
      flash("Copy failed — select the link manually");
    }
  }

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <input className="input mono" readOnly value={link} />
        <button className="btn" onClick={copyLink}>
          <Icon name="link" size={14} /> Copy
        </button>
      </div>
      <div className="row wrap">
        <a
          className="btn ghost sm"
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="link" size={15} /> Open public view
        </a>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
