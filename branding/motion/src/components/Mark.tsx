import React from "react";
import { COLORS, MARK } from "../theme";

/**
 * The TrackTub mark: a white verified check resting above a blue waterline.
 * Geometry mirrors brand/logo/mark/tracktub-mark-color-dark.svg. The check
 * draws on arm-by-arm (white = the record); the blue water then flows in
 * left-to-right (blue = the tub / brand). No green — green is verified-only.
 */
export const Mark: React.FC<{
  size: number;
  checkShort: number; // 0..1 draw of short arm
  checkLong: number; // 0..1 draw of long arm
  waterFront: number; // 0..1 draw of front wave
  waterBack: number; // 0..1 draw of back ripple
  bob?: number; // subtle vertical water motion, px in 64-space
  glow?: number;
}> = ({ size, checkShort, checkLong, waterFront, waterBack, bob = 0, glow = 0 }) => {
  const hidden = (p: number) => 1 - Math.max(0, Math.min(1, p));
  // Crop the 64x64 artwork to its content bounds so `size` maps to the visible
  // mark, not the empty padding around it. Check rises to y~7; water reaches y~49.
  const CROP = { x: 6, y: 6, w: 52, h: 46 };

  return (
    <svg
      width={size}
      height={size * (CROP.h / CROP.w)}
      viewBox={`${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}`}
      fill="none"
      style={{
        display: "block",
        overflow: "visible",
        filter: glow > 0 ? `drop-shadow(0 ${2 * glow}px ${12 * glow}px ${COLORS.brand}cc)` : undefined,
      }}
    >
      {/* water — blue, flows in under the check, with a faint continuous bob */}
      <g transform={`translate(0 ${bob})`}>
        <path
          d={MARK.water.back.d}
          stroke={COLORS.brand}
          strokeWidth={MARK.water.back.width}
          fill="none"
          opacity={MARK.water.back.opacity}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={hidden(waterBack)}
        />
        <path
          d={MARK.water.front.d}
          stroke={COLORS.brand}
          strokeWidth={MARK.water.front.width}
          fill="none"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={hidden(waterFront)}
        />
      </g>

      {/* verified check — white, square caps */}
      <path
        d={MARK.check.long}
        stroke={COLORS.textHi}
        strokeWidth={MARK.check.strokeWidth}
        strokeLinecap="square"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={hidden(checkLong)}
      />
      <path
        d={MARK.check.short}
        stroke={COLORS.textHi}
        strokeWidth={MARK.check.strokeWidth}
        strokeLinecap="square"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={hidden(checkShort)}
      />
    </svg>
  );
};
