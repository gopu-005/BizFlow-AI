/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bizflow: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 12s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 3s ease-in-out infinite alternate",
        "soundwave": "soundwave 1.2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 25px rgba(168, 85, 247, 0.4), 0 0 60px rgba(126, 34, 206, 0.2)" },
          "100%": { boxShadow: "0 0 45px rgba(168, 85, 247, 0.7), 0 0 90px rgba(147, 51, 234, 0.4)" },
        },
        soundwave: {
          "0%": { transform: "scaleY(0.4)" },
          "100%": { transform: "scaleY(1.3)" },
        }
      },
      boxShadow: {
        'orb': '0 0 60px -15px rgba(168, 85, 247, 0.5), 0 0 100px -20px rgba(99, 102, 241, 0.3)',
        'capsule': '0 20px 40px -15px rgba(76, 29, 149, 0.35), 0 0 0 1px rgba(168, 85, 247, 0.3)',
        'card-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
};
