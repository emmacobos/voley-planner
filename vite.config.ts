import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    // Firebase pesa ~600 kB; se descarga una vez y queda en caché.
    chunkSizeWarningLimit: 1200,
  },
  plugins: [react()],
})
