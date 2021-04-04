const clean = require("../utils/url-cleaner");

test("testing cleaning url works", () => {
  expect(clean("https://google.com")).toBe("google.com");
  expect(clean("http://facebook.com")).toBe("facebook.com");
  expect(clean("ht://nosense.com")).toBe("nosense.com");
  expect(clean("//nosense.com")).toBe("nosense.com");
});

test("testing cleaning url not works", () => {
  expect(clean("http:/wrong.com")).toBe("http:/wrong.com");
  expect(clean("http:nosense.com")).toBe("http:nosense.com");
});
