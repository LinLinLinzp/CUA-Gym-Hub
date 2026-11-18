import { defineConfig } from 'vite'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  plugins: [stateApi(createInitialData)],
  server: { port: 5534, strictPort: true },
  preview: { port: 5534, strictPort: true },
})
