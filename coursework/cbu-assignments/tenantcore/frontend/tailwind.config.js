/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#111a2e', 900: '#18233a', 800: '#24324a' },
        brand: { 50: '#eef8ff', 100: '#d9efff', 500: '#2487e0', 600: '#1470c2', 700: '#105a9c' },
        mint: { 500: '#17a98b', 50: '#eafaf5' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(17,26,46,.03), 0 8px 30px rgba(17,26,46,.04)',
        modal: '0 24px 80px rgba(17,26,46,.22)',
      },
    },
  },
  plugins: [],
};
