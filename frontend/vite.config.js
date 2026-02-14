import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  server: {
    port: 3006,
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
