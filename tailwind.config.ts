import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        river: {
          DEFAULT: '#1B3B2B',
          950: '#0E1F17',
          900: '#12281D',
          800: '#1B3B2B',
          700: '#25503A',
          600: '#2F6248',
          500: '#3F7A5B',
          200: '#BFD2C6',
          100: '#DCE6DF',
          50: '#EEF3EF',
        },
        sunset: {
          DEFAULT: '#D97706',
          50: '#FEF6E7',
          100: '#FDE9C8',
          200: '#FBD28F',
          400: '#F29A2E',
          500: '#D97706',
          600: '#B45309',
          700: '#92400E',
        },
        sand: {
          DEFAULT: '#FAF8F5',
          100: '#F4F0E9',
          200: '#EBE5DA',
          300: '#DDD5C6',
          400: '#C4B9A4',
        },
        ink: {
          DEFAULT: '#1F2A26',
          soft: '#46534D',
          mute: '#66726C',
        },
      },
      fontFamily: {
        sans: ['"Bricolage Grotesque Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4 Variable"', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        lift: '0 1px 2px rgba(18,40,29,.08), 0 12px 32px -12px rgba(18,40,29,.28)',
        ticket: '0 18px 40px -16px rgba(0,0,0,.55)',
      },
    },
  },
  plugins: [],
};

export default config;
