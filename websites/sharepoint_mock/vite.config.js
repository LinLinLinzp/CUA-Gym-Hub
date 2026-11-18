import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: 'localhost', port: 5394, strictPort: true }

// Resolve explicit dependency files without enumerating restricted Windows ancestors.
const windowsDependencyFiles = {
  name: 'windows-dependency-files',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.+\.[cm]?js$/ }, ({ path, resolveDir }) => {
      if (!resolveDir) return
      const file = resolve(resolveDir, path)
      if (statSync(file, { throwIfNoEntry: false })?.isFile()) return { path: file }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [windowsDependencyFiles] } } : undefined,
  server: local,
  preview: local,
})
