const { hash, verify } = require("../hash");

describe("Testing Hash & Verify Works!", () => {
  it("testing correct hash", () => {
    const plainTextWord = "password";
    const hashedWord = hash(plainTextWord);

    expect(verify(plainTextWord, hashedWord)).toBe(true);
  });

  it("testing incorrect hash", () => {
    const plainTextWord = "password";
    const hashedWord = hash("passwordDifferent");

    expect(verify(plainTextWord, hashedWord)).toBe(false);
  });
});
