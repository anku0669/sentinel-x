import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path = /sentinel-x/ when deployed to GitHub Pages
// Change this to '/your-repo-name/' if you fork under a different name.
export default defineConfig({
  plugins: [react()],
  base: '/sentinel-x/',
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
