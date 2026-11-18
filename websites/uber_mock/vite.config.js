import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { host: 'localhost', port: 5320, strictPort: true }

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  optimizeDeps: { include: ['jspdf'] },
  server: listener,
  preview: listener,
})
