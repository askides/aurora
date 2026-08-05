import { init } from "@paralleldrive/cuid2";

/**
 * Prisma generated ids with `@default(cuid())`; Drizzle has no equivalent, so
 * ids are minted in the application. Length 25 keeps the same shape the old
 * ids had, which matters because ids appear in dashboard URLs and in the
 * `aurora-id` attribute of every installed tracker snippet.
 */
export const createId = init({ length: 25 });
