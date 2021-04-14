const { AUTH_COOKIE, AUTH_COOKIE_LIFETIME } = require("../../../utils/constants");

describe("Testing AUTH_COOKIE", () => {
  it("has correct value", () => {
    expect(AUTH_COOKIE).to.eq("aurora_mp");
  });
});

describe("Testing AUTH_COOKIE_LIFETIME", () => {
  it("has correct value", () => {
    expect(AUTH_COOKIE_LIFETIME).to.eq(86400);
  });
});
