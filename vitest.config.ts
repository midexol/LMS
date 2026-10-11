import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Next.js uses `jsx: preserve`; tests need the automatic JSX transform instead.
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Live tests call real AI APIs and cost money: run them on purpose with `npm run test:live`.
    exclude: ["tests/live/**", "node_modules/**"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 15000,
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**", "src/middleware.ts", "src/components/**", "src/app/**/*.tsx"],
      exclude: ["src/**/*.d.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
