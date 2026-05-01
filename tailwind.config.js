/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Tokens semánticos del dominio. Cambian por theme via tokens.css.
        // Sintaxis con <alpha-value> para que Tailwind soporte bg-status-open/10 etc.
        status: {
          open: "hsl(var(--status-open) / <alpha-value>)",
          progress: "hsl(var(--status-progress) / <alpha-value>)",
          resolved: "hsl(var(--status-resolved) / <alpha-value>)",
          closed: "hsl(var(--status-closed) / <alpha-value>)",
        },
        priority: {
          low: "hsl(var(--priority-low) / <alpha-value>)",
          medium: "hsl(var(--priority-medium) / <alpha-value>)",
          high: "hsl(var(--priority-high) / <alpha-value>)",
          urgent: "hsl(var(--priority-urgent) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
  darkMode: "class",
}
