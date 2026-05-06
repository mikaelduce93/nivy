import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "tests/e2e/**",
      "tests/a11y/**",
      "playwright/**",
      "playwright-report/**",
      "test-results/**",
    ],
    passWithNoTests: false,
    coverage: {
      // Provider stays "v8" — install `@vitest/coverage-v8` (matching the
      // `vitest` version) before running `npm run test:coverage`. No blocking
      // thresholds yet: this lot only wires the reporter so the audit can
      // observe the current baseline before we ratchet up to 80%.
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.{ts,tsx}", "features/**/*.{ts,tsx}", "hooks/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "playwright/**",
        "playwright-report/**",
        "test-results/**",
        "coverage/**",
        "**/*.d.ts",
        "**/*.stories.{ts,tsx}",
        "**/types.ts",
        "app/**",
        "components/**",
      ],
    },
  },
})
