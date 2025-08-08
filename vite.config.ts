import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fefelina-admin/', // Ajuste para o nome do seu repositório GitHub
  build: {
    outDir: 'dist'
  }
})
