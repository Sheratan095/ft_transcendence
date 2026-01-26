/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'grid-v': 'gridV 2s ease-in-out infinite',
        'grid-h': 'gridH 2s ease-in-out infinite',
        'x': 'xDraw 3s ease-in-out infinite',
        'o': 'oDraw 3s ease-in-out 1s infinite',
      },
      keyframes: {
        gridV: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        gridH: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        xDraw: {
          '0%, 100%': { opacity: '0' },
          '25%': { opacity: '1' },
          '75%': { opacity: '1' },
        },
        oDraw: {
          '0%, 100%': { opacity: '0' },
          '25%': { opacity: '1' },
          '75%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};