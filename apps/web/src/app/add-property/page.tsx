"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPropertyAction } from "@/lib/actions/property";

export default function AddProperty() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [tubNotes, setTubNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showWtp, setShowWtp] = useState(false);

  function handleSubmit() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("address", address.trim());
    formData.append("tub_notes", tubNotes.trim());
    setError(null);
    startTransition(async () => {
      const result = await createPropertyAction(formData);
      if (result.ok) {
        router.push(`/p/${result.propertyId}`);
      } else if ("wtp" in result) {
        setShowWtp(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (showWtp) {
    return (
      <div className="stack" style={{ maxWidth: 560 }}>
        <div className="crumb">
          <Link href="/">Cockpit</Link> / Add property
        </div>
        <h1>Add a 2nd property</h1>
        <div className="note">
          You&apos;re on the <strong>Free plan</strong> (1 property included).
          Additional properties are <strong>$12 / property / month</strong>.
        </div>
        <div className="card pad stack">
          <p className="small" style={{ margin: 0 }}>
            Multi-property paid plan is coming. Join the waitlist and we&apos;ll
            reach out when it&apos;s available — at $12/mo per property.
          </p>
          <p className="tiny dim" style={{ margin: 0 }}>
            (PRD §12 WTP fake-door — this logs your intent. No charge, no card.)
          </p>
          <div className="row">
            <Link href="/" className="btn">
              ← Back to Cockpit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="crumb">
        <Link href="/">Cockpit</Link> / Add property
      </div>
      <h1>Add a property</h1>
      <div className="note">
        Your <strong>Free plan</strong> includes 1 property.
      </div>

      <div className="card pad stack">
        <div>
          <label className="label" htmlFor="pn">
            Property name <span style={{ color: "var(--urgent)" }}>*</span>
          </label>
          <input
            id="pn"
            className="input"
            placeholder="e.g. Aspen Ridge Cabin"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="addr">
            Address (optional)
          </label>
          <input
            id="addr"
            className="input"
            placeholder="123 Main St, Aspen CO"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Tub notes (optional)
          </label>
          <textarea
            id="notes"
            className="textarea"
            rows={3}
            placeholder="Model, quirks, recurring issues…"
            value={tubNotes}
            onChange={(e) => setTubNotes(e.target.value)}
          />
        </div>
        {error && (
          <p className="small" style={{ color: "var(--urgent)", margin: 0 }}>
            {error}
          </p>
        )}
        <button
          className="btn primary block"
          disabled={!name.trim() || isPending}
          onClick={handleSubmit}
        >
          {isPending ? "Creating…" : "Create property →"}
        </button>
      </div>
    </div>
  );
}
