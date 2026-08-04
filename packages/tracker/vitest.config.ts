import { defineConfig } from "vitest/config";

/**
 * The tracker reads the DOM as it is imported, so there has to be a document
 * before the module is even loaded.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
