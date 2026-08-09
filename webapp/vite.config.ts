import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// docker-compose mountet <repo>/data nach /var/www/html/data - im Dev-Betrieb
// arbeiten wir direkt auf demselben Verzeichnis.
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const ALLOWED = ['times.json', 'config.json']

const json = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

/**
 * Bildet api/read.php und api/write.php fuer "npm run dev" nach. Vite kann kein
 * PHP; ohne das hier braeuchte man fuer jede UI-Aenderung den Container, und
 * der Dev-Server wirft sonst nur ECONNREFUSED.
 *
 * Bewusst dieselben Regeln wie die PHP-Dateien: Whitelist, POST plus
 * application/json, fehlende Datei ergibt [], und geschrieben wird ueber eine
 * temporaere Datei. Produktiv bleibt PHP massgeblich - das hier laeuft nie im
 * Container, weil configureServer nur im Dev-Server greift.
 */
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

        // Als Text einlesen statt ueber Buffer - spart @types/node im Typecheck.
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
        // Kaputter Body darf eine gute Datei nicht leeren.
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
  // Nur fuer scripts/standalone.mjs: jspdf laedt html2canvas und dompurify per
  // import() nach. Als eigene Chunk-Dateien waeren sie aus einer einzelnen
  // HTML-Datei nicht erreichbar - der PDF-Export der Demo braeche dort.
  build: process.env.PW_STANDALONE
    ? { rollupOptions: { output: { inlineDynamicImports: true } } }
    : {},
})
