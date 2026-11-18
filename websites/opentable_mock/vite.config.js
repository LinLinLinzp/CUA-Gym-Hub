import { createRequire } from 'node:module'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: 'localhost', port: 5318, strictPort: true }

// Resolve relative optimizer imports without scanning restricted parent directories on Windows.
const windowsDependencyResolver = {
  name: 'windows-dependency-resolver',
  setup(build) {
    build.onResolve({ filter: /^\./ }, ({ importer, path }) => {
      try {
        return { path: createRequire(importer || import.meta.url).resolve(path) }
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND') throw error
      }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: local,
  preview: local,
  optimizeDeps: {
    esbuildOptions: { plugins: process.platform === 'win32' ? [windowsDependencyResolver] : [] },
  },
})
