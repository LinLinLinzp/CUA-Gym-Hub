import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: '127.0.0.1', port: 5484, strictPort: true }

// Explicit filenames can be resolved without listing restricted Windows ancestors.
const localDependencyFiles = {
  name: 'local-dependency-files',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.+\.[cm]?js$/ }, ({ path, resolveDir }) => {
      if (!resolveDir) return
      const filename = resolve(resolveDir, path)
      if (statSync(filename, { throwIfNoEntry: false })?.isFile()) return { path: filename }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [localDependencyFiles] } } : undefined,
  server: listener,
  preview: listener,
})
