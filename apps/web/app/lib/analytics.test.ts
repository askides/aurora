import { describe, expect, it } from "vitest";
import { RANGES, resolveFilters } from "./analytics.server";
import { isValidTimeZone } from "./timezone";

const url = (query: string) => new URL(`http://localhost/analytics${query}`);

/** resolveFilters throws a Response; unwrap it so assertions stay unconditional. */
const rejectionOf = (query: string) => {
  try {
    resolveFilters(url(query));
  } catch (error) {
    return error;
  }

  return undefined;
};

describe("resolveFilters", () => {
  it("defaults to the last 24 hours in UTC", () => {
    const filters = resolveFilters(url(""));

    expect(filters.range).toBe("LAST_24_HOURS");
    expect(filters.unit).toBe("hour");
    expect(filters.tz).toBe("UTC");
  });

  it("falls back to the default range for an unknown range key", () => {
    expect(resolveFilters(url("?range=LAST_CENTURY")).range).toBe(
      "LAST_24_HOURS"
    );
  });

  it("uses a day bucket for the multi-day ranges", () => {
    expect(resolveFilters(url("?range=LAST_7_DAYS")).unit).toBe("day");
    expect(resolveFilters(url("?range=LAST_30_DAYS")).unit).toBe("day");
  });

  it("keeps a valid IANA timezone", () => {
    expect(resolveFilters(url("?tz=Europe/Rome")).tz).toBe("Europe/Rome");
  });

  it("rejects a timezone that isn't a real zone with a 400", () => {
    // Guards the query that previously interpolated tz straight into SQL.
    const rejection = rejectionOf(
      "?tz=UTC%27%3B%20DROP%20TABLE%20events%3B%20--"
    );

    expect(rejection).toBeInstanceOf(Response);
    expect((rejection as Response).status).toBe(400);
  });

  it("produces a start before the end for every range", () => {
    for (const range of Object.keys(RANGES)) {
      const { start, end } = resolveFilters(url(`?range=${range}`));

      expect(Number(start)).toBeLessThan(Number(end));
    }
  });
});

describe("isValidTimeZone", () => {
  it.each(["UTC", "Europe/Rome", "America/New_York"])("accepts %s", (tz) => {
    expect(isValidTimeZone(tz)).toBe(true);
  });

  it.each(["Not/AZone", "'; DROP TABLE events; --", ""])("rejects %s", (tz) => {
    expect(isValidTimeZone(tz)).toBe(false);
  });
});
