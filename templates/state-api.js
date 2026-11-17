// Standard state API for every mock (dev + preview). Import in vite.config.js:
//
//   import { stateApi } from '../../templates/state-api.js'
//   import { createInitialData } from './src/data/seed.js'
//   export default defineConfig({ plugins: [react(), stateApi(createInitialData)] })
//
// Endpoints (sid-scoped, file-backed under .mock-states/):
//   POST /post   {action:"set"|"set_current"|"reset", state, merge?, initial_state?}
//   GET  /state  {stored_state, has_custom_state, sid}
//   GET  /go     {initial_state, current_state, state_diff}
//   POST /upload multipart -> {files:[{url, original_name, stored_name, size, content_type}]}
//   GET  /files/<sid>/<name>
// The task runtime (factory/runtime/sitehost) re-implements exactly this contract.

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const safe = (s) => String(s || '').replace(/[^a-zA-Z0-9_-]/g, '')

export function stateApi(createInitialData) {
  const root = process.cwd()
  const stateDir = path.join(root, '.mock-states')
  const filesDir = path.join(root, '.mock-files')
  fs.mkdirSync(stateDir, { recursive: true })
  fs.mkdirSync(filesDir, { recursive: true })

  const file = (sid, kind) => path.join(stateDir, `${safe(sid) || '_default'}${kind === 'initial' ? '.initial' : ''}.json`)
  const read = (sid, kind) => {
    try { return JSON.parse(fs.readFileSync(file(sid, kind), 'utf-8')) } catch { return null }
  }
  const write = (sid, kind, value) => fs.writeFileSync(file(sid, kind), JSON.stringify(value, null, 2))
  const merge = (a, b) => {
    const out = { ...a }
    for (const k in b) out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(out[k] || {}, b[k]) : b[k]
    return out
  }
  const json = (res, status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-cache, no-store')
    res.end(JSON.stringify(body))
  }
  const body = async (req) => { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c) }

  const handler = async (req, res, next) => {
    const url = new URL(req.url, 'http://x')
    const sid = url.searchParams.get('sid')
    try {
      if (url.pathname === '/state' && req.method === 'GET') {
        const s = read(sid)
        return json(res, 200, { stored_state: s, has_custom_state: s !== null, sid })
      }
      if (url.pathname === '/go' && req.method === 'GET') {
        const initial = read(sid, 'initial') || read(sid) || createInitialData()
        const current = read(sid) || initial
        const diff = {}
        for (const k in current) if (JSON.stringify(current[k]) !== JSON.stringify(initial[k])) diff[k] = { [k in initial ? 'modified' : 'added']: current[k] }
        return json(res, 200, { initial_state: initial, current_state: current, state_diff: diff })
      }
      if (url.pathname === '/post' && req.method === 'POST') {
        const data = JSON.parse((await body(req)).toString() || '{}')
        const action = data.action || 'set'
        if (action === 'reset') { write(sid, 'current', read(sid, 'initial') || createInitialData()); return json(res, 200, { success: true }) }
        if (action !== 'set' && action !== 'set_current') return json(res, 400, { error: 'Unknown action' })
        const next_ = data.merge ? merge(read(sid) || {}, data.state || {}) : data.state
        write(sid, 'current', next_)
        if (!read(sid, 'initial')) write(sid, 'initial', data.initial_state || next_)
        return json(res, 200, { success: true })
      }
      if (url.pathname === '/upload' && req.method === 'POST') {
        const boundary = /boundary=([^;]+)/.exec(req.headers['content-type'] || '')?.[1]
        if (!boundary) return json(res, 400, { error: 'multipart/form-data required' })
        const raw = await body(req)
        const dir = path.join(filesDir, safe(sid) || '_default')
        fs.mkdirSync(dir, { recursive: true })
        const files = []
        for (const part of raw.toString('latin1').split(`--${boundary}`).slice(1, -1)) {
          const [head, ...rest] = part.replace(/^\r\n/, '').split('\r\n\r\n')
          const name = /filename="([^"]*)"/.exec(head)?.[1]
          if (!name) continue
          const data = Buffer.from(rest.join('\r\n\r\n').replace(/\r\n$/, ''), 'latin1')
          const stored = `${randomUUID().slice(0, 8)}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
          fs.writeFileSync(path.join(dir, stored), data)
          files.push({ url: `/files/${safe(sid) || '_default'}/${stored}`, original_name: name, stored_name: stored, size: data.length,
            content_type: /Content-Type:\s*(.+)/i.exec(head)?.[1]?.trim() || 'application/octet-stream' })
        }
        return json(res, 200, { success: true, files })
      }
      if (url.pathname.startsWith('/files/') && req.method === 'GET') {
        const [, , s, ...rest] = url.pathname.split('/')
        const f = path.join(filesDir, safe(s), rest.join('/').replace(/[^a-zA-Z0-9._-]/g, '_'))
        if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('File not found') }
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(f).replace(/^[0-9a-f]{8}_/, '')}"`)
        return res.end(fs.readFileSync(f))
      }
    } catch (e) {
      return json(res, 400, { error: String(e.message || e) })
    }
    next()
  }

  return {
    name: 'mock-state-api',
    configureServer(server) { server.middlewares.use(handler) },
    configurePreviewServer(server) { server.middlewares.use(handler) },
  }
}
