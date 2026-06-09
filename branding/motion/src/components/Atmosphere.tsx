import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../theme";

/**
 * Dark stage atmosphere: hairline grid that drifts, a breathing verified-green
 * glow, a vignette, and a fine grain overlay. Restraint on purpose — this is a
 * minimal/sharp brand, so the texture stays felt-not-seen.
 */
export const Atmosphere: React.FC<{ glow?: number }> = ({ glow = 0 }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Very slow diagonal drift of the grid.
  const drift = (frame / fps) * 6; // px per second
  const cell = 64;

  // Gentle breathing on top of any externally-driven glow.
  const breathe = interpolate(
    Math.sin((frame / fps) * 1.1),
    [-1, 1],
    [0.35, 0.7],
  );
  const glowOpacity = Math.min(1, glow) * (0.5 + 0.5 * breathe);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      {/* Hairline grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.border} 1px, transparent 1px),
            linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: `${-drift}px ${-drift}px`,
          opacity: 0.28,
          maskImage:
            "radial-gradient(120% 120% at 50% 50%, black 35%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(120% 120% at 50% 50%, black 35%, transparent 78%)",
        }}
      />

      {/* Breathing brand-blue (water) glow behind the lockup */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(40% 38% at 50% 46%, ${COLORS.brand}26, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Vignette to seat the edges */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(75% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Fine grain */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", inset: 0, opacity: 0.04, mixBlendMode: "overlay" }}
      >
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
