/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Every text/background pair is verified by tests/colorContrast.test.js.
      colors: {
        ground: "#F2F7F7",
        surface: "#FFFFFF",
        line: "#D3E0E0",
        edge: "#6B8083", // input borders (>= 3:1 against white)
        ink: { DEFAULT: "#13242A", soft: "#47595F" },
        teal: { DEFAULT: "#0D3B44", dark: "#08292F", mid: "#1A5D6A" },
        amber: { DEFAULT: "#F2B134", light: "#F7C766" },
        "on-dark": "#D6EBEB",
        ok: { DEFAULT: "#1D5C37", bg: "#E4F3E9" },
        warn: { DEFAULT: "#7A4A00", bg: "#FCEFD2" },
        bad: { DEFAULT: "#8A2418", bg: "#FBE7E3" },
        info: { DEFAULT: "#0D3B44", bg: "#E2F0F1" },
      },
      fontFamily: {
        sans: ["-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      maxWidth: { prose: "42rem", page: "64rem" },
    },
  },
  plugins: [],
};

export default config;
