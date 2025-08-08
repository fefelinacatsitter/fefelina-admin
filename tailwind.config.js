/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf6f2',
          100: '#faeee5',
          200: '#f4d8c2',
          300: '#edc299',
          400: '#e5a575',
          500: '#e28e60', // Cor principal Fefelina (exata do CSS)
          600: '#d7784a',
          700: '#c4643a',
          800: '#a05332',
          900: '#82442c',
        },
        secondary: {
          50: '#f8f9fa', // Cor de fundo clara do CSS
          100: '#f0f0f0',
          200: '#d9d9d9',
          300: '#bfbfbf',
          400: '#8c8c8c',
          500: '#666666', // Cor de texto do CSS
          600: '#404040',
          700: '#333333', // Cor de texto principal do CSS
          800: '#1a1a1a',
          900: '#000000',
        },
        accent: {
          50: '#fff5f2',
          100: '#ffe9e1',
          200: '#ffd4c4',
          300: '#ffb59a',
          400: '#ff9170',
          500: '#ff9f6c', // Cor de destaque do CSS
          600: '#e8844a',
          700: '#d36b2f',
          800: '#b85625',
          900: '#9c4821',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'], // Fonte do CSS
      },
      boxShadow: {
        'fefelina': '0 8px 25px rgba(0, 0, 0, 0.1)', // Sombra do CSS
        'fefelina-hover': '0 15px 40px rgba(226, 142, 96, 0.15)', // Sombra hover do CSS
      },
    },
  },
  plugins: [],
}
