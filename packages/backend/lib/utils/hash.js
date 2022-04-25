import bcrypt from "bcryptjs";

export const hash = (plainText) => {
  return plainText ? bcrypt.hashSync(plainText, 10) : null;
};

export const verify = (plainText, hashText) => {
  return bcrypt.compareSync(plainText, hashText);
};
