module.exports = {
  purge: {
    content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
    options: {
      safelist: [
        "text-yellow-400",
        "text-red-400",
        "text-yellow-700",
        "text-red-700",
        "text-yellow-800",
        "text-red-800",
        "bg-yellow-50",
        "bg-red-50",
        "col-span-2",
        "col-span-1",
        "text-right",
        "truncate",
        "gap-y-10",
        "px-8",
        "py-8",
        "py-16",
      ],
    },
  },
  darkMode: "class",
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
