/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Fefelina (ver variáveis --color-* em src/index.css)
        // Peach: soft=#FDEBE1 (100), vivid=#FF9F6C (500), dark=#B85C2E (700)
        primary: {
          50: '#fff5f0',
          100: '#fdebe1', // peach-soft (cor exata)
          200: '#fbd8c4',
          300: '#fcc3a0',
          400: '#ffb088',
          500: '#ff9f6c', // peach-vivid (cor exata) - cor principal Fefelina
          600: '#e8814a',
          700: '#b85c2e', // peach-dark (cor exata)
          800: '#944a25',
          900: '#6e371b',
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
        // Lilac: soft=#E7E1F7 (100), vivid=#A876E3 (500) - cor de destaque
        lilac: {
          50: '#f5f2fc',
          100: '#e7e1f7', // lilac-soft (cor exata)
          200: '#d6cbf2',
          300: '#c2aeea',
          400: '#b692e5',
          500: '#a876e3', // lilac-vivid (cor exata)
          600: '#9059d0',
          700: '#7745ad',
          800: '#5f3689',
          900: '#482868',
        },
        // Alias de accent -> lilac, para uso como cor de destaque secundária
        accent: {
          50: '#f5f2fc',
          100: '#e7e1f7',
          200: '#d6cbf2',
          300: '#c2aeea',
          400: '#b692e5',
          500: '#a876e3',
          600: '#9059d0',
          700: '#7745ad',
          800: '#5f3689',
          900: '#482868',
        },
        ink: '#231f2b', // cor de texto/tinta de alto contraste
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'], // Fonte do CSS
      },
      boxShadow: {
        'fefelina': '0 8px 25px rgba(0, 0, 0, 0.1)', // Sombra do CSS
        'fefelina-hover': '0 15px 40px rgba(255, 159, 108, 0.15)', // Sombra hover (peach-vivid)
      },
    },
  },
  plugins: [],
}
