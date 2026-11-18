import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const endpoint = { host: '127.0.0.1', port: 5396, strictPort: true }
export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: endpoint,
  preview: endpoint,
})
