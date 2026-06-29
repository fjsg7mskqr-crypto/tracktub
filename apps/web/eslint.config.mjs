import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Flat ESLint config (ESLint 9 / Next 16). Replaces the legacy
 * `.eslintrc.json` (`extends: "next/core-web-vitals"`): Next 16 removed
 * `next lint`, and eslint-config-next 16 ships a flat-config array, so we run
 * ESLint directly via the `lint` script (`eslint .`).
 */
const config = [
  {
    ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
];

export default config;
