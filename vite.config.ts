import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig, type Plugin } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

const shouldUseNetlify = Boolean(process.env.NETLIFY_SITE_ID || process.env.NETLIFY)

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    // Allow specific hosts, including '169d9edabf2c.ngrok-free.app'
    allowedHosts: ['localhost', '127.0.0.1', 'fe44843df3a1.ngrok-free.app'],
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    shouldUseNetlify ? netlify() : null,
    viteReact(),
  ].filter(Boolean) as Plugin[],
  optimizeDeps: {
    exclude: ['@duckdb/node-bindings'],
  },
  ssr: {
    noExternal: ['@convex-dev/presence'], // Force external resolution
  },
})
