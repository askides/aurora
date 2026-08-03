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

describe("pages", () => {
  it("counts views per element and uniques by new visitor", async () => {
    vi.mocked(queries.getWebsiteViewsByPage).mockResolvedValue([
      { element: "/home", is_new_visitor: true },
      { element: "/home", is_new_visitor: false },
      { element: "/about", is_new_visitor: true },
    ] as never);

    const rows = await metrics.pages("wid", { start: "0", end: "1" });

    expect(rows).toEqual([
      { element: "/home", views: 2, unique: 1 },
      { element: "/about", views: 1, unique: 1 },
    ]);
  });

  it("returns an empty list when there are no events", async () => {
    vi.mocked(queries.getWebsiteViewsByPage).mockResolvedValue([] as never);

    await expect(
      metrics.pages("wid", { start: "0", end: "1" })
    ).resolves.toEqual([]);
  });
});

describe("metadata", () => {
  it("merges rows that share a value across versions", async () => {
    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue([
      {
        value: "Chrome",
        events: [{ is_new_visitor: true }, { is_new_visitor: false }],
      },
      { value: "Chrome", events: [{ is_new_visitor: true }] },
      { value: "Firefox", events: [{ is_new_visitor: false }] },
    ] as never);

    const rows = await metrics.metadata("wid", "browser", {
      start: "0",
      end: "1",
    });

    expect(rows).toEqual([
      { element: "Chrome", views: 3, unique: 2 },
      { element: "Firefox", views: 1, unique: 0 },
    ]);
  });

  it("resolves locale tags to a human readable location", async () => {
    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue([
      { value: "en-US", events: [{ is_new_visitor: true }] },
    ] as never);

    const [row] = await metrics.metadata("wid", "locale", {
      start: "0",
      end: "1",
    });

    expect(row.element).toBe("United States");
  });

  it("falls back to the raw tag for unknown locales", async () => {
    vi.mocked(queries.getWebsiteViewsByMetadata).mockResolvedValue([
      { value: "zz-ZZ", events: [{ is_new_visitor: false }] },
    ] as never);

    const [row] = await metrics.metadata("wid", "locale", {
      start: "0",
      end: "1",
    });

    expect(row.element).toBe("zz-ZZ");
  });
});

describe("statistics", () => {
  it("flattens the prisma aggregate shape", async () => {
    vi.mocked(queries.getWebsiteStatistics).mockResolvedValue({
      visits: { _count: { _all: 10 } },
      uniqueVisits: { _count: { _all: 4 } },
      bounces: { _count: { _all: 3 } },
      sessions: { _count: { _all: 5 } },
      avgDuration: { _avg: { duration: 2500 } },
    } as never);

    await expect(
      metrics.statistics("wid", { start: "0", end: "1" })
    ).resolves.toEqual({
      visits: 10,
      uniqueVisits: 4,
      bounces: 3,
      sessions: 5,
      avgDuration: 2500,
    });
  });

  it("reports zero duration when there are no events to average", async () => {
    vi.mocked(queries.getWebsiteStatistics).mockResolvedValue({
      visits: { _count: { _all: 0 } },
      uniqueVisits: { _count: { _all: 0 } },
      bounces: { _count: { _all: 0 } },
      sessions: { _count: { _all: 0 } },
      avgDuration: { _avg: { duration: null } },
    } as never);

    const stats = await metrics.statistics("wid", { start: "0", end: "1" });

    expect(stats.avgDuration).toBe(0);
  });
});

describe("timeseries", () => {
  it("pads buckets with no events and keeps chronological order", async () => {
    const start = Date.UTC(2026, 0, 1);
    const end = Date.UTC(2026, 0, 3);

    vi.mocked(queries.getWebsiteViewsTimeSeries).mockResolvedValue([
      { ts: new Date(Date.UTC(2026, 0, 2)), count: 7 },
    ] as never);

    const points = await metrics.timeseries("wid", {
      start: String(start),
      end: String(end),
      unit: "day",
      tz: "UTC",
    });

    expect(points).toHaveLength(3);
    expect(points.map((p) => p.count)).toEqual([0, 7, 0]);
  });
});
