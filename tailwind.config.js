/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#CB181D",
          mid: "#FB6A4A",
          light: "#FCAE91",
          tint: "#FDF1EE",
        },
      },
    },
  },
  plugins: [],
};
