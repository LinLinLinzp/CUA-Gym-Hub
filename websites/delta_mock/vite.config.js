import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  server: { host: 'localhost', port: 5323, strictPort: true },
  plugins: [react(), stateApi(createInitialData)],
})
