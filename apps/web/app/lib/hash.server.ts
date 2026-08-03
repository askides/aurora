import bcrypt from "bcryptjs";

export const hash = (plainText: string) => {
  return plainText ? bcrypt.hashSync(plainText, 10) : null;
};

export const verify = (plainText: string, hashText: string) => {
  return bcrypt.compareSync(plainText, hashText);
};
