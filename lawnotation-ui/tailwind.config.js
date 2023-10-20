/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
    "./node_modules/flowbite/**/*.{js,ts}"
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#0D5984",
        "primary-low": "#0b4b6f",
        "primary-high": "#236B95",

        "secondary": "#B6CDDA",
        "secondary-low": "#92b5c8",
        "secondary-high": "#C9DAE4"
      }
    },
  },
  plugins: [
    require('flowbite/plugin'),
    require('autoprefixer')
  ],
}

