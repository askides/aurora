const percentage = require("../utils/percentage");

test("testing percentage works", () => {
  expect(percentage(10, 100)).toBe(10);
  expect(percentage("10", 100)).toBe(10);
  expect(percentage(10, "100")).toBe(10);
  expect(percentage(1, 100)).toBe(1);
  expect(percentage(50, 150)).toBeCloseTo(33.33333, 5);
  expect(percentage(14.64, 133.2)).toBeCloseTo(10.99, 2);
});
