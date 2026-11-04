import colors from 'tailwindcss/colors';

// shadcn/ui "neutral" mavzusiga yaqin tokenlar (referens: Zenith dashboard)
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Barcha slate-* sinflari sof neytral kulrang shkalaga o'tadi
        slate: colors.neutral,
        // Matn/sarlavha rangi (foreground ≈ oklch 14.5%)
        navy: { DEFAULT: '#0a0a0a', 700: '#262626', 800: '#171717', 900: '#0a0a0a' },
        paper: '#ffffff',
        // primary ≈ oklch 20.5% (qora tugma, faol holat)
        brand: { DEFAULT: '#171717', 600: '#262626', soft: '#f5f5f5' },
        // Grafik palitrasi (referens ranglarining validator'dan o'tgan varianti, rang alomati bilan)
        chart: { 1: '#f54900', 2: '#009689', 3: '#0068a7', 4: '#d19b00' },
        sidebar: '#fafafa',
      },
      borderRadius: { sm: '6px', md: '8px', lg: '10px', xl: '14px' },
      letterSpacing: { eyebrow: '0.1em', tightest: '-0.025em' },
    },
  },
  plugins: [],
};
