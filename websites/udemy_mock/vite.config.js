import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

// Resolve explicit dependency files without listing restricted Windows ancestors.
const windowsDependencyFiles = {
  name: 'windows-dependency-files',
  setup(build) {
    build.onResolve({ filter: /^\.\.?\/.+\.[cm]?js$/ }, ({ path, resolveDir }) => {
      if (!resolveDir) return
      const filename = resolve(resolveDir, path)
      if (statSync(filename, { throwIfNoEntry: false })?.isFile()) return { path: filename }
    })
  },
}

const endpoint = { host: '127.0.0.1', port: 5372, strictPort: true }

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [windowsDependencyFiles] } } : undefined,
  server: endpoint,
  preview: endpoint,
})
