/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'accent-pink': '#ff009d',
        'accent-green': '#0dff66',
        'dark-green': '#16C760',
        'accent-cyan': '#00ffff',
        'accent-orange': '#ff6b35',
        'accent-blue': '#00a8e8',
        'accent-cyan-light': '#00d9ff',
      },
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