import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite accesul de pe orice dispozitiv din rețea
    port: 5173,      // Portul tău standard
    strictPort: true // Se asigură că folosește mereu acest port
  }
})