import localeCodes from "locale-codes";

export const tag = (language) => {
  return localeCodes.getByTag(language);
};
