/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ['"Fraunces"', "Georgia", "serif"],
      },
      fontWeight: {
        "400": "400",
        "500": "500",
        "600": "600",
        "700": "700",
      },
      colors: {
        canvas: "#FAF8F4",
        ink: {
          DEFAULT: "#0B1D26",
          soft: "#334A54",
          muted: "#6B7E86",
        },
        teal: {
          50: "#EAF6F5",
          100: "#D2ECEA",
          200: "#A6D8D4",
          300: "#6FBEB9",
          400: "#3B9E99",
          500: "#0E7C7B",
          600: "#0B6362",
          700: "#0A4F4E",
          800: "#083A3A",
          900: "#052828",
        },
        sand: {
          50: "#FBF9F5",
          100: "#F3EFE7",
          200: "#E7E0D3",
          300: "#D6CCB9",
        },
        gold: "#C9A24B",
        // Functional (not brand) colors — shared by the marketing site and
        // the dashboard, which previously each defined status colors
        // independently (or, for the dashboard, in a dead `DB_THEME`
        // constants file nothing imported). Kept close to their prior
        // dashboard values since these aren't brand identity, just
        // conventional success/warning/danger semantics.
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11,29,38,0.04), 0 8px 24px rgba(11,29,38,0.06)",
        lift: "0 20px 50px -20px rgba(11,29,38,0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
