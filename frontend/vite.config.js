import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3005',
        changeOrigin: true
      },
      '/photos': {
        target: 'http://localhost:3005',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
