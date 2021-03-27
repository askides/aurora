import { terser } from "rollup-plugin-terser";
export default {
  input: "tracker/aurora.js",
  output: {
    file: "public/aurora.js",
    format: "cjs",
    plugins: [terser()],
  },
};
