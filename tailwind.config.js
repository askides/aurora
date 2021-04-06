module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class", // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {
      transform: ["hover"],
      borderWidth: ["hover"],
      padding: ["first", "last"],
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
