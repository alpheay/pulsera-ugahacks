/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pulsera: {
          primary: "#F59E0B",
          safe: "#10B981",
          elevated: "#F97316",
          critical: "#EF4444",
          bg: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          text: "#E2E8F0",
          muted: "#94A3B8",
        },
      },
    },
  },
  plugins: [],
};
