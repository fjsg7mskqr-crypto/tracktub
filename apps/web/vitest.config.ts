import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Inject .env.local (Supabase keys) into the test process so the RLS suite can
// reach the real project. loadEnv with prefix "" pulls every var, not just VITE_.
export default defineConfig(({ mode }) => ({
  // React component tests (.test.tsx) need the JSX transform; the React plugin
  // also overrides tsconfig's `jsx: preserve` for the test build. Component
  // tests opt into jsdom per-file via `// @vitest-environment jsdom`.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
}));
