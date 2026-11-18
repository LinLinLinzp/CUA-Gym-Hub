import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  plugins: [stateApi(createInitialData)],
  server: { host: '127.0.0.1', port: 5332, strictPort: true },
  preview: { host: '127.0.0.1', port: 5332, strictPort: true },
  oxc: { jsx: { runtime: 'automatic' } },
})
