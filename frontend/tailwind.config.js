/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f6',
          100: '#d9e2ec',
          200: '#b6c9d8',
          300: '#8ba7c0',
          400: '#6482a4',
          500: '#4a6789',
          600: '#3a5270',
          700: '#2f425b',
          800: '#28384d',
          900: '#233041',
          950: '#17202d',
        },
        brand: {
          DEFAULT: '#1d4ed8', // blue-700
          light: '#3b82f6', // blue-500
          dark: '#1e40af', // blue-800
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
