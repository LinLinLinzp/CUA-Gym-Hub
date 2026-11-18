import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: 'localhost', port: 5359, strictPort: true }

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
  server: local,
  preview: local,
  esbuild: { jsx: 'automatic' },
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [localDependencyFiles] } } : undefined,
  plugins: [stateApi(createInitialData)],
})
