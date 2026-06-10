import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, COPY } from "./theme";
import { Atmosphere } from "./components/Atmosphere";
import { Mark } from "./components/Mark";
import { VerifiedTag } from "./components/VerifiedTag";
import { MONO_FAMILY, resolveDisplayFamily, type DisplayFontKey } from "./fonts";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type BrandRevealProps = {
  displayFont: DisplayFontKey;
};

export const BrandReveal: React.FC<BrandRevealProps> = ({ displayFont }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sans = resolveDisplayFamily(displayFont);

  // --- Mark: check draws on (white), then the blue water flows in ----------
  const checkShort = interpolate(frame, [10, 44], [0, 1], { ...clamp, easing: EASE });
  const checkLong = interpolate(frame, [40, 80], [0, 1], { ...clamp, easing: EASE });
  const waterFront = interpolate(frame, [74, 116], [0, 1], { ...clamp, easing: EASE });
  const waterBack = interpolate(frame, [84, 126], [0, 1], { ...clamp, easing: EASE });
  const markGlow = interpolate(frame, [84, 126, 190], [0, 1, 0.5], clamp);
  // Gentle continuous water bob once it has settled.
  const bob = waterFront >= 1 ? Math.sin((frame / fps) * 2.4) * 0.4 : 0;

  // --- Lockup formation (big centered mark -> mark + wordmark lockup) -------
  const lockupScale = interpolate(frame, [128, 200], [2.45, 1], { ...clamp, easing: EASE });
  const lockupTopPct = interpolate(frame, [128, 200], [50, 44], { ...clamp, easing: EASE });
  const wordmarkWidth = interpolate(frame, [150, 214], [0, 1400], { ...clamp, easing: EASE });

  // --- Signature device (the GREEN ✓ VERIFIED tag + typed metadata) --------
  const deviceSpring = spring({ frame: frame - 220, fps, config: { damping: 200 } });
  const deviceOpacity = interpolate(frame, [212, 234, 362, 390], [0, 1, 1, 0], clamp);
  const deviceExitY = interpolate(frame, [362, 390], [0, -26], { ...clamp, easing: EASE });
  const metaChars = Math.floor(interpolate(frame, [240, 338], [0, COPY.metadata.length], clamp));
  const typing = metaChars < COPY.metadata.length;
  const caretBlink = Math.floor((frame - 240) / 14) % 2 === 0;

  // --- One-liner + category (the resolved end card) ------------------------
  const oneLinerWords = COPY.oneLiner.split(" ");
  const categoryOpacity = interpolate(frame, [398, 430], [0, 1], clamp);

  const stageGlow = interpolate(frame, [84, 126], [0, 1], clamp);
  const markBase = 150;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      <Atmosphere glow={stageGlow} />

      {/* Lockup: mark + wordmark ("Track" white / "Tub" blue), scaling into place */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: `${lockupTopPct}%`,
          transform: `translate(-50%, -50%) scale(${lockupScale})`,
          transformOrigin: "center",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <Mark
          size={markBase}
          checkShort={checkShort}
          checkLong={checkLong}
          waterFront={waterFront}
          waterBack={waterBack}
          bob={bob}
          glow={markGlow}
        />
        <div style={{ overflow: "hidden", maxWidth: wordmarkWidth, whiteSpace: "nowrap" }}>
          <span
            style={{
              display: "block",
              paddingLeft: 28,
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 132,
              lineHeight: 1,
              letterSpacing: "-0.035em",
              color: COLORS.textHi,
            }}
          >
            {COPY.wordmarkTrack}
            <span style={{ color: COLORS.brand }}>{COPY.wordmarkTub}</span>
          </span>
        </div>
      </div>

      {/* Supporting slot — the signature device (the one place green belongs) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "64%",
          transform: `translate(-50%, ${deviceExitY}px)`,
          opacity: deviceOpacity,
        }}
      >
        <div style={{ transform: `scale(${0.9 + 0.1 * deviceSpring})` }}>
          <VerifiedTag
            monoFamily={MONO_FAMILY}
            captionFamily={sans}
            scale={1.15}
            metaText={COPY.metadata.slice(0, metaChars)}
            metaCaret={typing || caretBlink}
          />
        </div>
      </div>

      {/* One-liner — the positioning, word-staggered in */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "63%",
          transform: "translate(-50%, 0)",
          display: "flex",
          gap: "0.32em",
          maxWidth: 1300,
          flexWrap: "wrap",
          justifyContent: "center",
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 46,
          letterSpacing: "-0.02em",
          color: COLORS.textHi,
        }}
      >
        {oneLinerWords.map((word, i) => {
          const start = 378 + i * 3;
          const o = interpolate(frame, [start, start + 16], [0, 1], clamp);
          const y = interpolate(frame, [start, start + 16], [14, 0], { ...clamp, easing: EASE });
          return (
            <span key={i} style={{ opacity: o, transform: `translateY(${y}px)`, display: "inline-block" }}>
              {word}
            </span>
          );
        })}
      </div>

      {/* Category line — low-emphasis mono footnote */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "87%",
          transform: "translate(-50%, 0)",
          fontFamily: sans,
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: "-0.005em",
          color: COLORS.textLo,
          opacity: categoryOpacity,
          whiteSpace: "nowrap",
        }}
      >
        {COPY.category}
      </div>
    </AbsoluteFill>
  );
};
