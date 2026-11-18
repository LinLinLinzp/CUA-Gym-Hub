import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: { host: '127.0.0.1', port: 5439, strictPort: true },
  preview: { host: '127.0.0.1', port: 5439, strictPort: true },
})
