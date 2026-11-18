import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const mailRoute = /^\/n\/(?:inbox|folders|message|compose|contacts|settings|views)\//

function serveMalformedMailLinks(server) {
  server.middlewares.use((req, _res, next) => {
    if (['GET', 'HEAD'].includes(req.method) && mailRoute.test(req.url)) {
      const { pathname, search } = new URL(req.url, 'http://mail.local')
      try {
        decodeURIComponent(pathname)
      } catch {
        // Serve the SPA while leaving the browser's unavailable route and query intact.
        req.url = '/index.html' + search
      }
    }
    next()
  })
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData), {
    name: 'yahoo-mail-links', configureServer: serveMalformedMailLinks, configurePreviewServer: serveMalformedMailLinks,
  }],
  server: { port: 5300, strictPort: true },
  preview: { port: 5300, strictPort: true },
})
