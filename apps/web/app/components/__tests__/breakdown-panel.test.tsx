// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BreakdownPanel, ROW_CAP } from "../breakdown-panel";

// jest-dom's matchers are not registered by test/setup.ts, so everything here
// asserts on plain DOM.
afterEach(cleanup);

const row = (element: string, count: number, unique = count) => ({
  element,
  count,
  unique,
});

const tab = (rows: ReturnType<typeof row>[]) => ({
  value: "locales",
  label: "Language",
  kind: "locale" as const,
  unit: "views" as const,
  rows,
});

const text = (node: Element | null) => node?.textContent ?? "";

describe("BreakdownPanel", () => {
  it("adds up rows that arrive under the same label", () => {
    // `toLocaleName` in metrics.server.ts rewrites the stored BCP-47 tag to a
    // display name, and several tags share one: zh and zh-Hans are both
    // "Chinese (Simplified)", as are nb/no, sr/sr-Latn, uz/uz-Latn, az/az-Latn.
    // Keyed by the rewritten value, React warned about duplicate keys and the
    // panel drew the language twice with its counts split — 10 and 3 rather
    // than one row of 13.
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <BreakdownPanel
        title="Languages"
        tabs={[
          tab([
            row("Chinese (Simplified)", 10, 5),
            row("Chinese (Simplified)", 3, 2),
            row("English", 4, 4),
          ]),
        ]}
      />
    );

    const rows = screen.getAllByRole("row").slice(1);
    const cells = within(rows[0]).getAllByRole("cell");

    expect(rows).toHaveLength(2);
    expect(text(within(rows[0]).getByRole("rowheader"))).toBe(
      "Chinese (Simplified)"
    );
    expect(text(cells[0])).toBe("13");
    expect(text(cells[1])).toBe("7");
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it("associates every figure with the column it belongs to", () => {
    // Seven three-column grids on the dashboard and not one <table> or <th>
    // between them: a screen reader announced "/pricing 500 300" with no way
    // to tell which number was Views and which was Daily visitors.
    render(
      <BreakdownPanel title="Pages" tabs={[tab([row("/pricing", 500, 300)])]} />
    );

    const columns = screen.getAllByRole("columnheader").map(text);

    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(columns.slice(0, 2)).toEqual(["Language", "Views"]);
    expect(columns[2]).toContain("Daily visitors");
  });

  it("does not leave an orphan tabpanel when there is one dimension", () => {
    // Base UI's TabsPanel emits role="tabpanel" with tabIndex={0} whether or
    // not a Tab was registered, so hiding the list left an extra keyboard stop
    // owning no tab and carrying no accessible name.
    render(<BreakdownPanel title="Pages" tabs={[tab([row("/a", 1)])]} />);

    expect(screen.queryAllByRole("tabpanel")).toHaveLength(0);
  });

  it("keeps the tabs when there is more than one dimension", () => {
    render(
      <BreakdownPanel
        title="Devices"
        tabs={[
          { ...tab([row("desktop", 2)]), value: "device", label: "Device" },
          { ...tab([row("Chrome", 2)]), value: "browser", label: "Browser" },
        ]}
      />
    );

    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("does not claim a capped list is the whole list", () => {
    // Every breakdown is cut to BREAKDOWN_LIMIT after ordering by count, so
    // "Show all (100)" asserted completeness about the top hundredth of a
    // routine Pages list, with nothing else in the panel saying it was cut.
    const rows = Array.from({ length: ROW_CAP }, (_, index) =>
      row(`/page-${index}`, ROW_CAP - index)
    );

    render(<BreakdownPanel title="Pages" tabs={[tab(rows)]} />);

    expect(
      screen.getByRole("button", { name: `Show top ${ROW_CAP}` })
    ).toBeTruthy();
  });

  it("says the list is all of it when the query did not cut it", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      row(`/page-${index}`, 12 - index)
    );

    render(<BreakdownPanel title="Pages" tabs={[tab(rows)]} />);

    expect(screen.getByRole("button", { name: "Show all (12)" })).toBeTruthy();
  });

  it("heads the count column with the unit the panel was scoped in", () => {
    // The acquisition dimensions are grouped over `is_new_session` — one row
    // per arrival — so a "Views" header over them would be the same class of
    // defect as the scope it replaced, restated in a word rather than a number.
    // The unit rides along with the rows for exactly this reason: nothing
    // between the query and this header gets to decide it.
    render(
      <BreakdownPanel
        title="Sources"
        tabs={[
          {
            value: "channels",
            label: "Channel",
            kind: "channel",
            unit: "sessions",
            rows: [row("search", 320, 300), row("direct", 210, 200)],
          },
        ]}
      />
    );

    const columns = screen.getAllByRole("columnheader").map(text);

    expect(columns.slice(0, 2)).toEqual(["Channel", "Sessions"]);
  });

  it("names a channel rather than echoing the stored value", () => {
    // The column is lowercase and CHECK-constrained to five values, which is
    // what the panel would have printed: "search" under a capitalised header.
    render(
      <BreakdownPanel
        title="Sources"
        tabs={[
          {
            value: "channels",
            label: "Channel",
            kind: "channel",
            unit: "sessions",
            rows: [row("search", 3), row("campaign", 2)],
          },
        ]}
      />
    );

    const rows = screen.getAllByRole("row").slice(1);

    expect(
      rows.map((node) => text(within(node).getByRole("rowheader")))
    ).toEqual(["Search", "Campaign"]);
  });

  it("does not call the empty referrer bucket Direct", () => {
    // Direct means something narrower one tab over: `channel` calls a visit
    // `campaign` whenever the link carried utm parameters, referrer or not, so
    // a newsletter click sits in this bucket and under Campaign in the other.
    render(
      <BreakdownPanel
        title="Sources"
        tabs={[
          {
            value: "referrers",
            label: "Referrer",
            kind: "referrer",
            unit: "sessions",
            rows: [row("", 9)],
          },
        ]}
      />
    );

    expect(text(screen.getAllByRole("rowheader")[0])).toBe("No referrer");
  });

  it("names each metric hint after the metric it explains", () => {
    // Seventeen buttons all answering to "How this is measured" gave a screen
    // reader's rotor seventeen identical entries.
    render(
      <BreakdownPanel
        title="Sources"
        hint="Counted once per visit, at the pageview that started it."
        tabs={[tab([row("", 4)])]}
      />
    );

    expect(
      screen.getByRole("button", { name: "Sources: how this is measured" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Language daily visitors: how this is measured",
      })
    ).toBeTruthy();
  });

  it("gives the Daily visitors hint a different name in every panel", () => {
    // The column header is drawn once per table and there are fourteen tables
    // on a populated dashboard, so a fixed `about="Daily visitors"` put
    // fourteen identically-named buttons in the rotor — the defect MetricHint's
    // `about` exists to remove, reintroduced by the one hint drawn in a loop.
    render(
      <BreakdownPanel
        title="Campaigns"
        tabs={[
          { ...tab([row("newsletter", 3)]), value: "s", label: "Source" },
          { ...tab([row("email", 3)]), value: "m", label: "Medium" },
          { ...tab([row("spring", 3)]), value: "c", label: "Campaign" },
        ]}
      />
    );

    // Every table, not only the visible one: the panels are kept mounted so
    // each list holds its own expanded state, so the buttons in the hidden
    // tabpanels are in the document too and land in the same rotor the moment
    // their tab is opened.
    const names = [...document.querySelectorAll("[aria-label]")].map((node) =>
      node.getAttribute("aria-label")
    );

    expect(names).toEqual([
      "Source daily visitors: how this is measured",
      "Medium daily visitors: how this is measured",
      "Campaign daily visitors: how this is measured",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("gives every table an accessible name of its own", () => {
    // 0 of 13 cards carried aria-label or aria-labelledby, 0 tables did, and
    // there was not one <caption> on the dashboard: a screen reader's table
    // list showed seven unnamed tables in reading order. The CardTitle is a
    // plain div with no programmatic association to the table under it.
    render(
      <BreakdownPanel
        title="Campaigns"
        tabs={[
          { ...tab([row("newsletter", 3)]), value: "s", label: "Source" },
          { ...tab([row("email", 3)]), value: "m", label: "Medium" },
        ]}
      />
    );

    expect([...document.querySelectorAll("table > caption")].map(text)).toEqual(
      ["Campaigns: Source", "Campaigns: Medium"]
    );
  });

  it("does not say a single-dimension panel's name twice", () => {
    render(
      <BreakdownPanel
        title="Pages"
        tabs={[{ ...tab([row("/a", 1)]), value: "pages", label: "Pages" }]}
      />
    );

    expect([...document.querySelectorAll("table > caption")].map(text)).toEqual(
      ["Pages"]
    );
  });
});
