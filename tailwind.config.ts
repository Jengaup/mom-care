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
        // Sistema de estado centralizado (spec 6). No usar colores sueltos en la UI.
        status: {
          done: "#16a34a", // verde  - hecho / dado
          pending: "#ca8a04", // amarillo - pendiente / toca ahora
          late: "#dc2626", // rojo   - atrasado / omitido
          inactive: "#6b7280", // gris   - inactivo
        },
      },
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};

export default config;
