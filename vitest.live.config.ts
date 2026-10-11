import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Live tests: real calls to the AI provider configured in .env (costs a few cents per run).
 * They use no mocks and no database. Run with `npm run test:live`.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/live/**/*.test.ts"],
    testTimeout: 90000,
    fileParallelism: false,
  },
});
