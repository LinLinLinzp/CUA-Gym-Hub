import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: 'localhost', port: 5507, strictPort: true }

// Resolve explicit dependency files without listing restricted Windows ancestors.
const localDependencyFiles = {
  name: 'local-dependency-files',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.+\.[cm]?js$/ }, ({ path, resolveDir }) => {
      if (!resolveDir) return
      const file = resolve(resolveDir, path)
      if (statSync(file, { throwIfNoEntry: false })?.isFile()) return { path: file }
    })
  },
}

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [stateApi(createInitialData)],
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [localDependencyFiles] } } : undefined,
  server: listener,
  preview: listener,
})
