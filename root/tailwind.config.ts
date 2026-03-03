import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#0f1117",
        panel: "#161b27",
        border: "#1e2533",
        muted: "#4b5563",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
export default config;
