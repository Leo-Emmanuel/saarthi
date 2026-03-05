import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Always rebuild the dep cache on startup to prevent stale 504 errors
    force: true,
  },
})

