import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const localhost = { host: '127.0.0.1', port: 5361, strictPort: true }

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: localhost,
  preview: localhost,
})
