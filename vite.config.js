import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ścieżki względne, żeby ta sama paczka działała w przeglądarce i w Electronie (app://)
  base: './',
})
