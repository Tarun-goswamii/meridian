import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    // Allow specific hosts, including '169d9edabf2c.ngrok-free.app'
    allowedHosts: ['localhost', '127.0.0.1', '28ec673e8f8d.ngrok-free.app'],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    ...(Array.isArray(netlify) ? netlify : [netlify]),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ['@duckdb/node-bindings'],
  },
})
