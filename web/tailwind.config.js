/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backdropBlur: {
        '7': '7px',
        '7.5': '7.5px',
        '17.5': '17.5px',
      },
      backgroundBlendMode: {
        'hard-light': 'hard-light',
        'plus-lighter': 'plus-lighter',
        'color-dodge': 'color-dodge',
      },
    },
  },
  plugins: [],
}

