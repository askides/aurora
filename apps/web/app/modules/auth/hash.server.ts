import { compareSync, hashSync } from "bcryptjs";

export const hash = (plainText: string) => {
  return plainText ? hashSync(plainText, 10) : null;
};

export const verify = (plainText: string, hashText: string) => {
  return compareSync(plainText, hashText);
};
