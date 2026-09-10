/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F9FA',
        charcoal: '#111827',
        muted: '#6B7280',
        subtle: '#9CA3AF',
        income: {
          DEFAULT: '#2E7D56',
          subtle: '#E8F5EE'
        },
        expense: {
          DEFAULT: '#C25E4A',
          subtle: '#FDF2F0'
        }
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