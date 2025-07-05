/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // All JS/TS/React files in src/
    "./public/index.html"         // Your main HTML file
  ],
  theme: {
    extend: {},                   // You can add custom theme extensions here
  },
  plugins: [],                    // Add Tailwind plugins here if needed
};
