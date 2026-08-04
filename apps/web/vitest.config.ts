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
    // Servers run UTC, so the suite defaults to it for reproducibility.
    //
    // This is a blind spot as much as a convenience: pinning the zone here is
    // exactly what stops the suite noticing when the host zone leaks into a
    // calculation, and three such leaks were found by hand rather than by a
    // failing test. The cases that guard it therefore set `process.env.TZ`
    // themselves at runtime — grep for it before assuming this line covers you.
    env: { TZ: "UTC" },
  },
});
