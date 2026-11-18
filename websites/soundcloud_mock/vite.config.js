import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  plugins: [stateApi(createInitialData)],
  server: { host: 'localhost', port: 5357, strictPort: true },
  preview: { host: 'localhost', port: 5357, strictPort: true },
})
