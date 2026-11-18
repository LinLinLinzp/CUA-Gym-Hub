import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const dataManager = fileURLToPath(new URL('./src/utils/dataManager.js', import.meta.url))
const orderedStateTransport = {
  name: 'basecamp-ordered-state-transport',
  enforce: 'pre',
  transform(source, id) {
    if (id !== dataManager) return
    // Bind fetch in the template module only, in dev and in the built app.
    return `import { fetchForState as fetch } from './stateTransport.js'\n${source}`
  },
}

export default defineConfig({
  plugins: [orderedStateTransport, react(), stateApi(createInitialData)],
  server: { port: 5385, strictPort: true },
})
