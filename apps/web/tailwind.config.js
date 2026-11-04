/**
 * Дизайн тизими (StaffX услуби): яшил брэнд, оқ юзалар, юмшоқ кулранг фон.
 * Ранглар шу ерда токен сифатида белгиланади — саҳифаларда HEX ишлатилмайди.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Брэнд яшили: тугмалар, фаол меню, прогресс, графиклар
        brand: {
          DEFAULT: '#12a06b', 50: '#effaf5', 100: '#d9f2e6', 200: '#b3e5cf', 300: '#7dd1b0',
          400: '#3fb88b', 500: '#12a06b', 600: '#0c8454', 700: '#0c6f4a', soft: '#effaf5',
        },
        // Сарлавҳа ва асосий матн (тўқ яшил-қора)
        ink: { DEFAULT: '#14201b', 700: '#243029', 500: '#5b6b63', 400: '#8a978f' },
        // Фон ва чегаралар
        surface: { DEFAULT: '#f5f7f6', line: '#e6ebe8' },
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
      boxShadow: { card: '0 1px 2px rgb(20 32 27 / 0.04), 0 4px 16px rgb(20 32 27 / 0.04)' },
    },
  },
  plugins: [],
};
