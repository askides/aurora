const path = require("path");

module.exports = {
  entry: "./lib/tracker/aurora.js",
  output: {
    path: path.resolve(__dirname, "api/_files"),
    filename: "tracker.js",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
      },
    ],
  },
};
