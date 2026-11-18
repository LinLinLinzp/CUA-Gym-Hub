import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: 'localhost', port: 5472, strictPort: true }
export default defineConfig({
  plugins: [stateApi(createInitialData)],
  server: listener,
  preview: listener,
})
