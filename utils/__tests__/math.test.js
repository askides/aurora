const { percentage, sum } = require("../math");

describe("Testing Percentage Calculation Works", () => {
  it("two integers works", () => {
    expect(percentage(10, 100)).toBe(10);
    expect(percentage(50, 150)).toBeCloseTo(33.33333, 5);
    expect(percentage(3, 5)).toBe(60);
  });

  it("mixed int/string params works", () => {
    expect(percentage("10", 100)).toBe(10);
    expect(percentage(10, "100")).toBe(10);
  });

  it("float paramteres works", () => {
    expect(percentage(14.64, 133.2)).toBeCloseTo(10.99, 2);
  });
});

describe("Testing Sum Calculation Works", () => {
  it("no parameter", () => {
    expect(sum()).toBe(0);
  });

  it("one parameter", () => {
    expect(sum([12])).toBe(12);
  });

  it("three parameters", () => {
    expect(sum([10, 5, 2])).toBe(17);
  });
});
