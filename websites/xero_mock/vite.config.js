import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: { port: 5413, strictPort: true },
  preview: { port: 5413, strictPort: true },
})
