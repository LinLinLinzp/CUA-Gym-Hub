import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

function filePreviewAlias() {
  function install(server) {
    server.middlewares.use((request, _response, next) => {
      // One segment belongs to the SPA. Harbor reserves /files/<sid>/<name> for uploads.
      if (['GET', 'HEAD'].includes(request.method) && /^\/files\/[^/?]+\/?(?:\?|$)/.test(request.url)) {
        request.url = request.url.replace(/^\/files\//, '/preview/')
      }
      next()
    })
  }
  return { name: 'file-preview-alias', configureServer: install, configurePreviewServer: install }
}

export default defineConfig({
  plugins: [react(), filePreviewAlias(), stateApi(createInitialData)],
  server: { port: 5393, strictPort: true },
  preview: { port: 5393, strictPort: true },
})
