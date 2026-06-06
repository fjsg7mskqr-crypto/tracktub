"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";

export function DemoGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(localStorage.getItem("tt.guide.dismissed") !== "1");
  }, []);
  if (!show) return null;
  return (
    <div
      className="card pad"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="spread">
        <span className="row" style={{ gap: 9 }}>
          <Icon name="sparkle" size={16} style={{ color: "var(--text-lo)" }} />
          <strong style={{ fontWeight: 600 }}>Demo walkthrough</strong>
        </span>
        <button
          className="btn ghost sm"
          onClick={() => {
            localStorage.setItem("tt.guide.dismissed", "1");
            setShow(false);
          }}
        >
          Dismiss
        </button>
      </div>
      <ol
        className="small"
        style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8 }}
      >
        <li>Switch role top-right: Operator → Cleaner → Owner.</li>
        <li>
          As a <strong>Cleaner</strong>, open a property that needs a turnover →{" "}
          <strong>New turnover</strong> (try “Simulate an issue”).
        </li>
        <li>
          As <strong>Operator</strong>, open the record → <strong>Share</strong>{" "}
          the proof → open the proof link.
        </li>
        <li>
          Check <strong>Insights</strong>, then the <strong>Add property</strong>{" "}
          $12/mo fake-door.
        </li>
      </ol>
    </div>
  );
}
