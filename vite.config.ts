import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/fefelina-admin/', // Ajuste para o nome do seu repositório GitHub
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Agrupa libs de vendor pesadas em chunks dedicados e estáveis,
        // evitando que o recharts (usado por múltiplas páginas lazy) seja
        // duplicado entre chunks por causa de dependências circulares internas.
        manualChunks: {
          recharts: ['recharts'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  }
})
