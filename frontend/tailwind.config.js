/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['Manrope', 'sans-serif'],
        body: ['Public Sans', 'sans-serif'],
      },
      colors: {
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#0F172A",
        background: "#FFFFFF",
        foreground: "#0F172A",
        primary: {
          DEFAULT: "#0F172A",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#F1F5F9",
          foreground: "#0F172A",
        },
        accent: {
          DEFAULT: "#3B82F6",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        status: {
          new: "#3B82F6",
          contacted: "#8B5CF6",
          demo: "#F59E0B",
          converted: "#10B981",
          lost: "#EF4444",
          followup: "#06B6D4",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
