import React from "react";
import { Composition } from "remotion";
import { BrandReveal } from "./BrandReveal";
import { DEFAULT_DISPLAY } from "./fonts";

const FPS = 30;
const DURATION_SECONDS = 15;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BrandReveal"
      component={BrandReveal}
      durationInFrames={Math.round(FPS * DURATION_SECONDS)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ displayFont: DEFAULT_DISPLAY }}
    />
  );
};
