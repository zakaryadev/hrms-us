export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // To'q ko'k sidebar va sarlavhalar
        navy: { DEFAULT: '#0f172a', 700: '#1e293b', 800: '#172033', 900: '#0f172a' },
        // Moviy aksent (tugmalar, faol holat, progress)
        brand: { DEFAULT: '#1d4ed8', 600: '#1e40af', soft: '#eff6ff' },
      },
    },
  },
  plugins: [],
};
