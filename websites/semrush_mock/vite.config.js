import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const server = { host: '127.0.0.1', port: 5469, strictPort: true }
const resolveReactCommonJs = {
  name: 'resolve-react-commonjs',
  setup(build) {
    // Resolve CommonJS directly when Windows filesystem isolation blocks esbuild's ancestor scan.
    build.onResolve({ filter: /.*/ }, ({ importer, path, kind }) => {
      if (kind === 'require-call' && /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(importer)) {
        return { path: createRequire(importer).resolve(path) }
      }
    })
  },
}
export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server,
  preview: server,
  optimizeDeps: process.platform === 'win32' ? { esbuildOptions: { plugins: [resolveReactCommonJs] } } : undefined,
})

