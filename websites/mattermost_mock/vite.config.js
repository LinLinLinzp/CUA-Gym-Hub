import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const listener = { port: 5304, strictPort: true }

export default defineConfig({
  plugins: [react(), stateApi(createInitialData)],
  server: listener,
  preview: listener,
  build: { rollupOptions: { output: { manualChunks: { markdown: ['react-markdown', 'remark-gfm'] } } } },
})
