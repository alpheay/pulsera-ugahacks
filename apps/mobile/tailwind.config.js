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
          background: "#0a0a0a",
          foreground: "#fafafa",
          card: "#171717",
          primary: "#e5e5e5",
          "primary-foreground": "#171717",
          secondary: "#262626",
          muted: "#262626",
          "muted-foreground": "#a1a1a1",
          ring: "#737373",
          destructive: "#ff6467",
          safe: "#00bc7d",
          warning: "#fe9a00",
          danger: "#ff2056",
          info: "#1447e6",
          interactive: "#ad46ff",
        },
        glass: {
          card: "rgba(255,255,255,0.08)",
          "card-elevated": "rgba(255,255,255,0.12)",
          border: "rgba(255,255,255,0.18)",
          "border-subtle": "rgba(255,255,255,0.12)",
          "tab-bar": "rgba(23,23,23,0.65)",
          overlay: "rgba(0,0,0,0.55)",
        },
      },
      borderRadius: {
        glass: "20px",
        "glass-sm": "14px",
      },
    },
  },
  plugins: [],
};
