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
  {
    // eslint-config-next 16 newly bundles the React Compiler / react-hooks RC
    // rule set (`purity`, `static-components`, `set-state-in-effect`). These
    // were NOT part of `next/core-web-vitals` on Next 15, and they fire on
    // patterns that are correct for our App Router code — e.g. `new Date()` /
    // `Date.now()` inside async Server Components (not subject to React render
    // purity). Adopting that brand-new standard is out of scope for a pure
    // dependency bump, so we keep the prior lint contract here and track the
    // opt-in cleanup separately rather than refactoring working code under the
    // upgrade. (Removing these re-enables the rules.)
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
