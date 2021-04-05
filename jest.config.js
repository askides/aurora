module.exports = async () => {
  return {
    verbose: true,
    rootDir: ".",
    modulePathIgnorePatterns: ["<rootDir>/cypress/"],
  };
};
