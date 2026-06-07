import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

// Inject .env.local (Supabase keys) into the test process so the RLS suite can
// reach the real project. loadEnv with prefix "" pulls every var, not just VITE_.
export default defineConfig(({ mode }) => ({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
}));
