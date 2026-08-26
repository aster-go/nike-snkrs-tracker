/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nike: {
          black: '#111111',
          dark: '#1a1a1a',
          card: '#222222',
          border: '#333333',
          accent: '#f5f5f5',
          orange: '#fa5400',
          green: '#00a550',
          yellow: '#f5a623',
          red: '#e2231a',
        },
      },
      fontFamily: {
        nike: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
