/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f172a',      // slate-900
          darker: '#020617',    // slate-950
          light: '#f8fafc',     // slate-50
          accent: '#6366f1',    // indigo-500
          cyan: '#06b6d4',      // cyan-500
          violet: '#8b5cf6',    // violet-500
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
