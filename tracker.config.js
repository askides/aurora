const path = require("path");

module.exports = {
  entry: "./tracker/aurora.js",
  output: {
    path: path.resolve(__dirname, "public"),
    filename: "aurora.js",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
