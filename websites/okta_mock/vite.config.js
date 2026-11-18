import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: 'localhost', port: 5410, strictPort: true }

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  server: listener,
  preview: listener,
  plugins: [stateApi(createInitialData)],
})
