/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-muted': 'rgb(var(--surface-muted) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        subtle: 'rgb(var(--subtle) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          solid: 'rgb(var(--accent-solid) / <alpha-value>)',
        },
        expense: {
          DEFAULT: 'rgb(var(--expense) / <alpha-value>)',
          soft: 'rgb(var(--expense-soft) / <alpha-value>)',
          'soft-strong': 'rgb(var(--expense-soft-strong) / <alpha-value>)',
          solid: 'rgb(var(--expense-solid) / <alpha-value>)',
          strong: 'rgb(var(--expense-strong) / <alpha-value>)',
        },
        credit: 'rgb(var(--credit) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      spacing: {
        margin: '1.25rem',
      }
    },
  },
  plugins: [],
}
