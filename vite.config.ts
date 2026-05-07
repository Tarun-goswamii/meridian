import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import netlify from '@netlify/vite-plugin-tanstack-start'

const enableNetlify =
  process.env.NETLIFY === 'true' ||
  !!process.env.NETLIFY_SITE_ID ||
  !!process.env.NETLIFY_AUTH_TOKEN

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
    ...(enableNetlify ? [netlify()] : []),
    viteReact(),
  ],
  optimizeDeps: {
    exclude: ['@duckdb/node-bindings'],
  },
  ssr: {
    noExternal: ['@convex-dev/presence'], // Force external resolution
    external: [
      'node:events',
      'node:stream',
      'node:util',
      'node:crypto',
      'node:buffer',
      'node:path',
      'node:fs',
      'node:os',
      'node:http',
      'node:https',
      'node:net',
      'node:zlib',
    ],
  },
})
