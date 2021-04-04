const { hash, verify } = require("../utils/hash");

test("testing correct hash", () => {
  const plainTextWord = "password";
  const hashedWord = hash(plainTextWord);

  expect(verify(plainTextWord, hashedWord)).toBe(true);
});

test("testing incorrect hash", () => {
  const plainTextWord = "password";
  const hashedWord = hash("passwordDifferent");

  expect(verify(plainTextWord, hashedWord)).toBe(false);
});
