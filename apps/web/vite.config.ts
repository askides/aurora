import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/**
 * Every Base UI entry point the app imports.
 *
 * Base UI ships one subpath per component, and each one carries its own copy of
 * the library's internal contexts. If Vite pre-bundles some subpaths during the
 * initial scan and then discovers the rest on navigation, it re-optimizes and
 * the page ends up holding two module graphs at once — at which point Base UI
 * components read a React dispatcher that isn't theirs and throw
 * "Cannot read properties of null (reading 'useContext')" during hydration.
 *
 * Listing them up front means the scan is complete before the first request, so
 * no mid-session re-optimization can happen. Keep in sync with the imports in
 * app/components/ui — `grep -rhoE '@base-ui/react/[a-z-]+' app/ | sort -u`.
 */
const baseUi = [
  "alert-dialog",
  "avatar",
  "button",
  "collapsible",
  "dialog",
  "input",
  "menu",
  "merge-props",
  "popover",
  "progress",
  "scroll-area",
  "select",
  "separator",
  "switch",
  "tabs",
  "toggle",
  "toggle-group",
  "tooltip",
  "use-render",
].map((entry) => `@base-ui/react/${entry}`);

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  optimizeDeps: {
    /**
     * Vite's dependency scan walks route modules before the server-only exports
     * are stripped, so it reaches the database and hashing packages too. Left to
     * discovery they are optimized on the first navigation that touches them,
     * and the resulting mid-flight reload lands while the page is hydrating —
     * the page then renders but never becomes interactive. Naming everything
     * here makes the first scan complete, so no reload can happen later. They
     * are still tree-shaken out of what actually ships to the browser.
     */
    include: [
      ...baseUi,
      "recharts",
      "sonner",
      "lucide-react",
      "@paralleldrive/cuid2",
      "bcryptjs",
      "class-variance-authority",
      "clsx",
      "date-fns",
      "drizzle-orm",
      "drizzle-orm/node-postgres",
      "drizzle-orm/pg-core",
      "locale-codes",
      "pg",
      "react-hook-form",
      "tailwind-merge",
      "ua-parser-js",
      "zod",
    ],
  },
});
