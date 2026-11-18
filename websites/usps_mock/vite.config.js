import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: {
    host: 'localhost',
    port: 5532,
    strictPort: true,
    watch: { ignored: ['**/.mock-states/**', '**/.mock-files/**', '**/.test-work/**'] },
  },
  preview: { host: 'localhost', port: 5532, strictPort: true },
})
