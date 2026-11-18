import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const endpoint = { host: 'localhost', port: 5340, strictPort: true }

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [stateApi(createInitialData)],
  server: endpoint,
  preview: endpoint,
})
