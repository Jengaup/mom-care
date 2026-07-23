import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta cálida "diario de cuidado" (no gris clínico).
        bg: "#f6f4ef",
        surface: "#ffffff",
        ink: "#1f2a28",
        // Oscurecido para pasar contraste AA (>=4.5:1) sobre el fondo arena.
        muted: "#55635f",
        line: "#e2ddd2",
        brand: { DEFAULT: "#15803d", dark: "#166534", soft: "#e8f2ea" },
        // Sistema de estado centralizado (spec 6). No usar colores sueltos.
        status: {
          done: "#16a34a", // verde  - hecho / dado
          pending: "#d97706", // ámbar  - pendiente / toca ahora
          late: "#dc2626", // rojo   - atrasado / omitido
          inactive: "#8a9490", // gris   - inactivo
        },
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(31, 42, 40, 0.04), 0 4px 16px rgba(31, 42, 40, 0.05)",
        nav: "0 -1px 0 rgba(31,42,40,0.06), 0 -8px 24px rgba(31,42,40,0.05)",
      },
      minHeight: { touch: "48px" },
      minWidth: { touch: "48px" },
    },
  },
  plugins: [],
};

export default config;
