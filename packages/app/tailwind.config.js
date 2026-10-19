/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral dark-gray scale (page surfaces, borders, muted text).
        // Every `forest-*` usage across the app resolves through here, so the
        // whole UI re-themes from this one map. Green is reserved for the
        // `accent` scale (CTAs, key highlights) below.
        forest: {
          950: '#111417',
          900: '#1A1F24',
          800: '#262D34',
          700: '#333C45',
          600: '#4A5560',
          500: '#6B7784',
          400: '#9AA4B0',
          300: '#C7CED6',
        },
        // Action green — the previous forest greens, kept for primary
        // buttons and deliberate highlights only.
        accent: {
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
