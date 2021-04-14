const { dropProtocol } = require("../../../utils/urls");

describe("Testing Url dropProtocoling works", () => {
  it("testing with correct protocols", () => {
    expect(dropProtocol("https://google.com")).to.eq("google.com");
    expect(dropProtocol("http://facebook.com")).to.eq("facebook.com");
    expect(dropProtocol("ht://nosense.com")).to.eq("nosense.com");
    expect(dropProtocol("//nosense.com")).to.eq("nosense.com");
  });

  it("testing with incorrect protocols", () => {
    expect(dropProtocol("ht://nosense.com")).to.eq("nosense.com");
    expect(dropProtocol("//nosense.com")).to.eq("nosense.com");
  });

  it("testing without syntax correct protocols", () => {
    expect(dropProtocol("http:/wrong.com")).to.eq("http:/wrong.com");
    expect(dropProtocol("http:nosense.com")).to.eq("http:nosense.com");
  });
});
