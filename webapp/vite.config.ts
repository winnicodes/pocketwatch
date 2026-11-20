import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const ALLOWED = ['times.json', 'config.json']

const json = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

// Dev-server stand-in for public/api/*.php.
function devApi(): Plugin {
  return {
    name: 'pocketwatch-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/read.php', async (req, res) => {
        const file = new URL(req.url ?? '', 'http://x').searchParams.get('file') ?? ''
        if (!ALLOWED.includes(file)) return json(res, 403, { error: 'File not allowed' })
        const body = await readFile(join(DATA_DIR, file), 'utf8').catch(() => '[]')
        json(res, 200, body)
      })

      server.middlewares.use('/api/write.php', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'POST required' })
        if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
          return json(res, 415, { error: 'Content-Type must be application/json' })
        }

        req.setEncoding('utf8')
        let raw = ''
        for await (const chunk of req) raw += chunk

        let payload: { file?: string; data?: unknown }
        try {
          payload = JSON.parse(raw)
        } catch {
          return json(res, 400, { error: 'Invalid JSON' })
        }

        const file = payload.file ?? ''
        if (!ALLOWED.includes(file)) return json(res, 403, { error: 'File not allowed' })
        if (payload.data == null) return json(res, 400, { error: 'Missing data' })

        const path = join(DATA_DIR, file)
        const tmp = `${path}.tmp`
        try {
          await mkdir(DATA_DIR, { recursive: true })
          await writeFile(tmp, JSON.stringify(payload.data, null, 2))
          await rename(tmp, path)
        } catch (err) {
          await unlink(tmp).catch(() => {})
          return json(res, 500, { error: String(err) })
        }
        json(res, 200, { success: true })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  // Standalone build: inline jspdf's dynamic imports into one file.
  build: process.env.PW_STANDALONE
    ? { rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
})
