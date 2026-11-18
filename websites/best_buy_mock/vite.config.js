import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const endpoint = { host: 'localhost', port: 5311, strictPort: true }
export default defineConfig({ plugins: [react(), stateApi(createInitialData)], server: endpoint, preview: endpoint })
