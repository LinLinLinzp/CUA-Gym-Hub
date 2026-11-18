import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const localServer = { host: 'localhost', port: 5544, strictPort: true }

// Use Node's file resolver for CommonJS dependencies in restricted Windows workspaces.
const nodeRequires = {
  name: 'resolve-node-requires',
  setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      if (args.kind !== 'require-call' || !args.importer.includes('node_modules')) return
      return { path: createRequire(args.importer).resolve(args.path), namespace: 'node-package' }
    })
    build.onLoad({ filter: /.*/, namespace: 'node-package' }, args => ({
      contents: readFileSync(args.path, 'utf8'),
      loader: 'js',
    }))
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? {
    noDiscovery: true,
    include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'react-router-dom'],
    esbuildOptions: { plugins: [nodeRequires] },
  } : undefined,
  server: {
    ...localServer,
    watch: { ignored: ['**/.mock-states/**', '**/.mock-files/**', '**/test-results/**'] },
  },
  preview: localServer,
})
