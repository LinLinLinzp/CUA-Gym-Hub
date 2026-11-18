import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

// Resolve dependency imports without enumerating Windows sandbox parent directories.
const nativeDependencyResolver = {
  name: 'native-dependency-resolver',
  setup(build) {
    build.onResolve({ filter: /./ }, ({ path, importer }) => {
      try {
        return { path: createRequire(importer || import.meta.url).resolve(path) }
      } catch {
        return undefined
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [nativeDependencyResolver] } } : undefined,
  server: { host: '127.0.0.1', port: 5317, strictPort: true },
  preview: { host: '127.0.0.1', port: 5317, strictPort: true },
})
