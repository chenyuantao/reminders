/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'reminder-blue': '#007AFF',
        'reminder-gray': '#8E8E93',
        'reminder-light-gray': '#F2F2F7',
      },
    },
  },
  plugins: [],
} 