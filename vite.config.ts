import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    // Firebase pesa ~640 kB, pero se descarga aparte, después de mostrar la app.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Firebase y React van en archivos aparte: cambian poco y quedan en caché.
        manualChunks(id: string) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react';
        },
      },
    },
  },
  plugins: [react()],
})
