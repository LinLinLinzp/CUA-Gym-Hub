import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const localServer = { host: 'localhost', port: 5496, strictPort: true }

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: localServer,
  preview: localServer,
})
