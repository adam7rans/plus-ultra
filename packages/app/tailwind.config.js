/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Survival-themed dark green palette
        forest: {
          950: '#0D1F16',
          900: '#1A3A2A',
          800: '#1F4731',
          700: '#245438',
          600: '#2D6B45',
          500: '#3A8A58',
          400: '#4CAF72',
          300: '#6FCF97',
        },
        danger: {
          900: '#3B1111',
          700: '#7F1D1D',
          500: '#EF4444',
          400: '#F87171',
        },
        warning: {
          700: '#92400E',
          500: '#F59E0B',
          400: '#FCD34D',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
