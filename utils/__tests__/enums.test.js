const { TimeRanges } = require("../enums");

describe("Testing TimeRanges", () => {
  it("has day property", () => {
    expect(TimeRanges.hasOwnProperty("DAY")).toBe(true);
    expect(TimeRanges.DAY).toBe("day");
  });

  it("has week property", () => {
    expect(TimeRanges.hasOwnProperty("WEEK")).toBe(true);
    expect(TimeRanges.WEEK).toBe("week");
  });

  it("has month property", () => {
    expect(TimeRanges.hasOwnProperty("MONTH")).toBe(true);
    expect(TimeRanges.MONTH).toBe("month");
  });

  it("has year property", () => {
    expect(TimeRanges.hasOwnProperty("YEAR")).toBe(true);
    expect(TimeRanges.YEAR).toBe("year");
  });

  it("is frozen", () => {
    TimeRanges.DAY = "n00b";
    TimeRanges.NEW_PROP = "Yeah!";
    expect(TimeRanges.DAY).toBe("day");
    expect(TimeRanges.hasOwnProperty("NEW_PROP")).toBe(false);
  });
});
