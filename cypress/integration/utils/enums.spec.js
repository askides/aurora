const { TimeRanges } = require("../../../utils/enums");

describe("Testing TimeRanges", () => {
  it("has day property", () => {
    expect(TimeRanges.hasOwnProperty("DAY")).to.eq(true);
    expect(TimeRanges.DAY).to.eq("day");
  });

  it("has week property", () => {
    expect(TimeRanges.hasOwnProperty("WEEK")).to.eq(true);
    expect(TimeRanges.WEEK).to.eq("week");
  });

  it("has month property", () => {
    expect(TimeRanges.hasOwnProperty("MONTH")).to.eq(true);
    expect(TimeRanges.MONTH).to.eq("month");
  });

  it("has year property", () => {
    expect(TimeRanges.hasOwnProperty("YEAR")).to.eq(true);
    expect(TimeRanges.YEAR).to.eq("year");
  });

  it("is frozen", () => {
    TimeRanges.DAY = "n00b";
    TimeRanges.NEW_PROP = "Yeah!";
    expect(TimeRanges.DAY).to.eq("day");
    expect(TimeRanges.hasOwnProperty("NEW_PROP")).to.eq(false);
  });
});
