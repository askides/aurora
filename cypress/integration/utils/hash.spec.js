const { hash, verify } = require("../../../utils/hash");

describe("Testing Hash & Verify Works!", () => {
  it("testing correct hash", () => {
    const plainTextWord = "password";
    const hashedWord = hash(plainTextWord);

    expect(verify(plainTextWord, hashedWord)).to.eq(true);
  });

  it("testing incorrect hash", () => {
    const plainTextWord = "password";
    const hashedWord = hash("passwordDifferent");

    expect(verify(plainTextWord, hashedWord)).to.eq(false);
  });
});
