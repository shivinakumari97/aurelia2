import type { Config } from "tailwindcss";

/**
 * Aurelia design system.
 * Aesthetic: refined, editorial luxury. Warm "aureate" gold accents,
 * deep ink neutrals, parchment surfaces, elegant serif display + clean sans body.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aureate gold accent ramp
        gold: {
          50: "#FBF6E9",
          100: "#F4E8C8",
          200: "#E9D098",
          300: "#DBB766",
          400: "#CDA24A",
          500: "#B8893B", // primary brand gold
          600: "#9A6F2E",
          700: "#7A5624",
          800: "#5C401C",
          900: "#3D2B13",
        },
        // Ink neutrals (warm-tinted)
        ink: {
          50: "#F7F6F3",
          100: "#ECEAE4",
          200: "#D7D3C8",
          300: "#B3AD9D",
          400: "#85806F",
          500: "#5E5A4D",
          600: "#454236",
          700: "#322F26",
          800: "#1F1D18",
          900: "#141310",
          950: "#0B0A08",
        },
        parchment: "#FBF8F2",
        success: "#3F7D58",
        warning: "#B8893B",
        danger: "#A8443A",
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(20,19,16,0.04), 0 8px 24px -12px rgba(20,19,16,0.12)",
        lift: "0 2px 4px rgba(20,19,16,0.06), 0 20px 40px -20px rgba(20,19,16,0.25)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
