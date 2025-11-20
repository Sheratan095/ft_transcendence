/** @type {import('tailwindcss').Config} */
  module.exports = {
   mode: 'jit',
    purge: [
      "./index.html",
      "./src/**/*.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      // ...
    }
    // ...
  }
export default {
  content: [
    "./index.html",
    "./src/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}