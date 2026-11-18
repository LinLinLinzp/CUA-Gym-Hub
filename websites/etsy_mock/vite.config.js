import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: '127.0.0.1', port: 5312, strictPort: true }

// Resolve explicit relative dependency files without scanning restricted Windows ancestors.
const localDependencyFiles = {
  name: 'local-dependency-files',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.+\.js$/ }, (args) => {
      if (!args.resolveDir) return
      const path = resolve(args.resolveDir, args.path)
      if (statSync(path, { throwIfNoEntry: false })?.isFile()) return { path }
    })
  },
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: local,
  preview: local,
  optimizeDeps: {
    esbuildOptions: { plugins: process.platform === 'win32' ? [localDependencyFiles] : [] },
  },
})
