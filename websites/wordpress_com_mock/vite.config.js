import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { stateApi } from '../../templates/state-api.js'
import { createInitialData } from './src/data/seed.js'

const adminEntryPoints = new Set([
  '/wp-admin/edit.php', '/wp-admin/post-new.php', '/wp-admin/post.php',
  '/wp-admin/upload.php', '/wp-admin/edit-comments.php',
])

function adminFallback() {
  const useFallback = (server) => {
    server.middlewares.use((req, _res, next) => {
      const pathname = req.url?.split('?')[0].replace(/%2e/ig, '.')
      if (['GET', 'HEAD'].includes(req.method) && adminEntryPoints.has(pathname)) {
        req.url = '/index.html'
      }
      next()
    })
  }
  return { name: 'admin-entry-points', configureServer: useFallback, configurePreviewServer: useFallback }
}

export default defineConfig({
  plugins: [react(), stateApi(createInitialData), adminFallback()],
  server: { port: 5349, strictPort: true },
  preview: { port: 5349, strictPort: true },
})
