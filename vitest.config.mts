// vitest.config.mts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "server-only": path.resolve(rootDir, "tests/integration/stubs/server-only.ts"),
    },
  },
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/features/admin/**/*.test.tsx",
      "tests/unit/features/reporting/**/*.test.tsx",
      "tests/unit/features/invoices/**/*.test.tsx",
      "tests/unit/features/ai/**/*.test.tsx",
    ],
    setupFiles: ["./tests/unit/setup.ts"],
  },
});
