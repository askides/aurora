const clean = require("../../../utils/url-cleaner");

describe("Testing Url cleaning works", () => {
  it("testing with correct protocols", () => {
    expect(clean("https://google.com")).to.eq("google.com");
    expect(clean("http://facebook.com")).to.eq("facebook.com");
    expect(clean("ht://nosense.com")).to.eq("nosense.com");
    expect(clean("//nosense.com")).to.eq("nosense.com");
  });

  it("testing with incorrect protocols", () => {
    expect(clean("ht://nosense.com")).to.eq("nosense.com");
    expect(clean("//nosense.com")).to.eq("nosense.com");
  });

  it("testing without syntax correct protocols", () => {
    expect(clean("http:/wrong.com")).to.eq("http:/wrong.com");
    expect(clean("http:nosense.com")).to.eq("http:nosense.com");
  });
});
