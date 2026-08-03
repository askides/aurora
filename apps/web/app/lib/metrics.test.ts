import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./queries.server", () => ({
  getWebsiteStatistics: vi.fn(),
  getWebsiteViewsByMetadata: vi.fn(),
  getWebsiteViewsByPage: vi.fn(),
  getWebsiteViewsTimeSeries: vi.fn(),
}));

const queries = await import("./queries.server");
const metrics = await import("./metrics.server");

beforeEach(() => {
  vi.resetAllMocks();
});

/**
 * Counting now happens in Postgres (see queries.server.ts), so what remains to
 * unit test here is the bucket padding and the locale label mapping.
 */
describe("timeseries", () => {
  it("pads buckets with no events and keeps chronological order", async () => {
    const start = Date.UTC(2026, 0, 1);
    const end = Date.UTC(2026, 0, 3);

    vi.mocked(queries.getWebsiteViewsTimeSeries).mockResolvedValue([
      { ts: new Date(Date.UTC(2026, 0, 2)), count: 7 },
    ]);

    const points = await metrics.timeseries("wid", {
      start: String(start),
      end: String(end),
      unit: "day",
      tz: "UTC",
    });

    expect(points).toHaveLength(3);
    expect(points.map((p) => p.count)).toEqual([0, 7, 0]);
  });

  it("returns a zeroed series when the window has no events at all", async () => {
    vi.mocked(queries.getWebsiteViewsTimeSeries).mockResolvedValue([]);

    const points = await metrics.timeseries("wid", {
      start: String(Date.UTC(2026, 0, 1)),
      end: String(Date.UTC(2026, 0, 3)),
      unit: "day",
      tz: "UTC",
    });

    expect(points).toHaveLength(3);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it("rejects a unit it cannot bucket", async () => {
    vi.mocked(queries.getWebsiteViewsTimeSeries).mockResolvedValue([]);

    await expect(
      metrics.timeseries("wid", {
        start: String(Date.UTC(2026, 0, 1)),
        end: String(Date.UTC(2026, 0, 2)),
        unit: "fortnight",
        tz: "UTC",
      })
    ).rejects.toThrow(/Invalid unit/);
  });
});

describe("metadata", () => {
  it("resolves locale tags to a human readable location", async () => {
    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue([
      { element: "en-US", views: 3, unique: 2 },
    ]);

    const [row] = await metrics.metadata("wid", "locale", {
      start: "0",
      end: "1",
    });

    expect(row.element).toBe("United States");
    expect(row.views).toBe(3);
  });

  it("falls back to the raw tag for unknown locales", async () => {
    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue([
      { element: "zz-ZZ", views: 1, unique: 0 },
    ]);

    const [row] = await metrics.metadata("wid", "locale", {
      start: "0",
      end: "1",
    });

    expect(row.element).toBe("zz-ZZ");
  });

  it("passes non-locale dimensions through untouched", async () => {
    const rows = [{ element: "Chrome", views: 4, unique: 1 }];

    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue(rows);

    await expect(
      metrics.metadata("wid", "browser", { start: "0", end: "1" })
    ).resolves.toEqual(rows);
  });
});

describe("getTzOffset", () => {
  it("reports UTC as a zero offset", () => {
    expect(metrics.getTzOffset("UTC", new Date("2026-01-15T12:00:00Z"))).toBe(
      0
    );
  });

  it("shifts a date into the target zone", () => {
    const base = new Date("2026-01-15T12:00:00Z");

    expect(metrics.switchTz(base, "UTC").getTime()).toBe(base.getTime());
  });
});
