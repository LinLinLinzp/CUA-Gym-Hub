import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const local = { host: 'localhost', port: 5513, strictPort: true }

export default defineConfig({
  plugins: [stateApi(createInitialData)],
  oxc: { jsx: { runtime: 'automatic' } },
  server: local,
  preview: local,
})
