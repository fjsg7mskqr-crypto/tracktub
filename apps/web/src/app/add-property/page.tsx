"use client";

import { useState } from "react";
import Link from "next/link";
import { useDB, addWaitlist } from "@/lib/store";

export default function AddProperty() {
  const db = useDB();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  if (!db) return <div className="skeleton">Loading…</div>;

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="crumb">
        <Link href="/">Cockpit</Link> / Add property
      </div>
      <h1>Add a property</h1>

      <div className="note">
        You're on the <strong>Free plan</strong> (1 property included).
        Additional properties are <strong>$12 / property / month</strong>.
      </div>

      {!done ? (
        <div className="card pad stack">
          <div>
            <label className="label" htmlFor="pn">
              Property name
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
            <label className="label" htmlFor="nt">
              Anything we should know? (optional)
            </label>
            <textarea
              id="nt"
              className="textarea"
              rows={3}
              placeholder="How many tubs, who cleans them, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            className="btn primary block"
            disabled={!name.trim()}
            onClick={() => {
              addWaitlist(name.trim(), note.trim());
              setDone(true);
            }}
          >
            Add for $12/mo → join the paid waitlist
          </button>
          <p className="tiny dim">
            Demo: this is the willingness-to-pay fake-door (PRD §12). It logs
            paid intent — no charge, no card.
          </p>
        </div>
      ) : (
        <div className="card pad stack">
          <span className="badge ok" style={{ alignSelf: "flex-start" }}>
            ✓ You're on the list
          </span>
          <p style={{ margin: 0 }}>
            Thanks — we logged interest in adding <strong>{name}</strong> at
            $12/mo. (In the real product this is the moment we learn whether
            multi-property operators will actually pay.)
          </p>
          <div className="row">
            <Link href="/insights" className="btn">
              See it on Insights →
            </Link>
            <button
              className="btn ghost"
              onClick={() => {
                setName("");
                setNote("");
                setDone(false);
              }}
            >
              Add another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
