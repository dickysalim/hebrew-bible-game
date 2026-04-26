import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Redirect 404s to index.html so react-router-dom handles all paths
    historyApiFallback: true,
  },
})
