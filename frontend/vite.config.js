import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/me': 'http://localhost:8000',
      '/projects': 'http://localhost:8000',
      '/project': 'http://localhost:8000',
      '/roadmap': 'http://localhost:8000',
      '/checkpoint': 'http://localhost:8000',
    },
  },
})
