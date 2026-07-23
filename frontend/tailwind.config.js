/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We will tie colors to CSS variables so they update dynamically with our theme engine
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        bg: 'var(--color-bg)',
        text: 'var(--color-text)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        mitsRed: '#800000',
        mitsDarkRed: '#660000',
      },
      fontFamily: {
        sans: ['NumericFont', 'Outfit', 'Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        cinzel: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
}
