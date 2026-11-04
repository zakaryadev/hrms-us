export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0F1542', 700: '#1a2260', 800: '#141a52', 900: '#0F1542' },
        brand: { DEFAULT: '#E50019', 600: '#c40016' },
      },
    },
  },
  plugins: [],
};
