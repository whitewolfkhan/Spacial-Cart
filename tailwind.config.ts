import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6d5efc",
          dark: "#4b3fd1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
