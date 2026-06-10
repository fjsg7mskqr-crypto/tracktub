// Display-font candidates (the founder dislikes Inter; this picks the new face
// by eye). Mono is fixed: JetBrains Mono is the brand's "machine record" tell.
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const displayWeights = ["500", "600", "700"] as const;

const archivo = loadArchivo("normal", { weights: [...displayWeights], subsets: ["latin"] });
const bricolage = loadBricolage("normal", { weights: [...displayWeights], subsets: ["latin"] });
const geist = loadGeist("normal", { weights: [...displayWeights], subsets: ["latin"] });
const jetbrains = loadJetBrains("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const MONO_FAMILY = jetbrains.fontFamily;

export type DisplayFontKey = "archivo" | "bricolage" | "geist";

export const DISPLAY_FONTS: Record<DisplayFontKey, { label: string; family: string }> = {
  archivo: { label: "Archivo", family: archivo.fontFamily },
  bricolage: { label: "Bricolage Grotesque", family: bricolage.fontFamily },
  geist: { label: "Geist", family: geist.fontFamily },
};

export const DEFAULT_DISPLAY: DisplayFontKey = "geist";

export const resolveDisplayFamily = (key: DisplayFontKey): string =>
  (DISPLAY_FONTS[key] ?? DISPLAY_FONTS[DEFAULT_DISPLAY]).family;
