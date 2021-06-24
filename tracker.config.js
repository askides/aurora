const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv").config();

console.log(dotenv.parsed);
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
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(dotenv.parsed),
    }),
  ],
};
