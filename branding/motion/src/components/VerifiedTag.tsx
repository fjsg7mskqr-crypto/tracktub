import React from "react";
import { COLORS } from "../theme";

/**
 * The signature device: a monospace `✓ VERIFIED` tag (accent on a dim accent
 * fill) over a metadata line. This is the brand's most reusable element — it
 * carries both the SaaS look and the proof differentiator at once.
 */
export const VerifiedTag: React.FC<{
  monoFamily: string; // the ✓ VERIFIED badge — the signature device
  captionFamily: string; // the metadata caption beneath it (sans, not robo-mono)
  scale?: number;
  tagOpacity?: number;
  metaText?: string; // already-sliced (typewriter) metadata
  metaCaret?: boolean;
}> = ({ monoFamily, captionFamily, scale = 1, tagOpacity = 1, metaText = "", metaCaret = false }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18 * scale,
        fontFamily: monoFamily,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12 * scale,
          padding: `${10 * scale}px ${18 * scale}px`,
          borderRadius: 8 * scale,
          border: `1px solid ${COLORS.verified}40`,
          background: `${COLORS.verified}14`,
          color: COLORS.verified,
          fontSize: 30 * scale,
          fontWeight: 500,
          letterSpacing: "0.18em",
          opacity: tagOpacity,
        }}
      >
        <span style={{ fontSize: 30 * scale, lineHeight: 1 }}>✓</span>
        <span>VERIFIED</span>
      </div>
      <div
        style={{
          fontFamily: captionFamily,
          fontWeight: 400,
          fontSize: 22 * scale,
          color: COLORS.textLo,
          letterSpacing: "-0.005em",
          whiteSpace: "nowrap",
          minHeight: 26 * scale,
        }}
      >
        {metaText}
        <span
          style={{
            display: "inline-block",
            width: 11 * scale,
            height: 24 * scale,
            marginLeft: 4 * scale,
            transform: "translateY(4px)",
            background: metaCaret ? COLORS.textLo : "transparent",
          }}
        />
      </div>
    </div>
  );
};
