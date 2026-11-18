import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: 'localhost', port: 5355, strictPort: true }

// Resolve explicit dependency files without traversing restricted Windows parent directories.
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

export default defineConfig({
  plugins: [stateApi(createInitialData)],
  esbuild: { jsx: 'automatic' },
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [windowsDependencyFiles] } } : undefined,
  server: local,
  preview: local,
})
