module.exports = (api) => {
  // const isTest = api.env("test");
  api.cache(true);

  return {
    presets: [
      [
        "@babel/preset-env",
        {
          targets: { node: "current" },
        },
      ],
    ],
  };
};
