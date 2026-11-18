import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: 'localhost', port: 5313, strictPort: true }
// Resolve internal dependency imports through Node when esbuild cannot scan parent directories on Windows.
const resolveInstalledDependencies = {
  name: 'resolve-installed-dependencies',
  setup(builder) {
    builder.onResolve({ filter: /^\./ }, ({ path, importer }) => {
      if (!importer || !/[\\/]node_modules[\\/]/.test(importer)) return
      try {
        return { path: createRequire(importer).resolve(path) }
      } catch {
        return undefined
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: { esbuildOptions: { plugins: [resolveInstalledDependencies] } },
  server: listener,
  preview: listener,
})
