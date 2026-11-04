import colors from 'tailwindcss/colors';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Neytral kulrang shkala iliq (stone) — barcha slate-* sinflari shu bilan qayta bo'yaladi
        slate: colors.stone,
        // Logotip navy'si: yon panel va sarlavhalar
        navy: { DEFAULT: '#0f1542', 700: '#1b2262', 800: '#141a52', 900: '#0b1033' },
        // Sahifa foni ("qog'oz")
        paper: '#f5f4f0',
        // Asosiy harakat rangi (tugma, fokus, faol holat)
        brand: { DEFAULT: '#2340c4', 600: '#1b33a1', soft: '#eef1fc' },
      },
      letterSpacing: { eyebrow: '0.14em' },
    },
  },
  plugins: [],
};
