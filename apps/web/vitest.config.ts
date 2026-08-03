import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Kept separate from vite.config.ts: the reactRouter() plugin expects to drive a
 * full app build and isn't needed to exercise loaders, actions and lib code.
 */
export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    // Timeseries buckets are generated with date-fns in local time, so results
    // depend on the host zone. Servers run UTC; pin tests to match.
    env: { TZ: "UTC" },
  },
});
