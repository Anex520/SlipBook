import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps asset paths relative, so the same build works on a web host,
// GitHub Pages and inside the Android app.
export default defineConfig({
  base: './',
  plugins: [react()],
})
