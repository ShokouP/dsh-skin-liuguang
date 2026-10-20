/**
 * Aurora — host half of the browser-face package.
 *
 * Why this package exists: the Desktop app boots its renderer from a static
 * index inside app.asar, so `webserver/index-inject` never reaches it. The
 * browser half (`lib/client.js`) is delivered through the client module graph
 * instead. Client metadata is cached per loader specifier for the life of the
 * host, so a package that first loaded without `dsh.client` never gains one —
 * a *new* specifier does, and the running page picks it up without a restart.
 *
 * It owns the only `/aurora/ping` route (the main package deliberately does
 * not register one): the renderer calls it after injecting the skin, which
 * proves the live page loaded it.
 *
 * The route is loopback-only, GET/HEAD-only, throttled, and the token is
 * reduced to a short safe alphabet before it reaches the log.
 */
import { appendFileSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const name = 'theme-aurora-browser'

const ACTIVITY = new URL('./activity.log', import.meta.url)
const PET = new URL('../assets/pet.png', import.meta.url)
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const PING_INTERVAL_MS = 3000
const MAX_LOG_BYTES = 256 * 1024

let lastPing = 0

function note(line) {
  try {
    const file = fileURLToPath(ACTIVITY)
    try {
      if (statSync(file).size > MAX_LOG_BYTES) writeFileSync(file, '')
    } catch {
      /* first write creates the file */
    }
    appendFileSync(file, `${new Date().toISOString()} ${line}\n`)
  } catch {
    /* diagnostics only */
  }
}

function isLoopback(req) {
  const address = req.socket?.remoteAddress ?? ''
  return LOOPBACK.has(address)
}

export function apply(ctx) {
  note(`apply pid=${process.pid}`)
  ctx.on('dispose', () => note(`dispose pid=${process.pid}`))

  ctx.inject(['webServer'], (child) => {
    // The pet sprite: a local, credited fan-art asset (see assets/CREDITS.md).
    child.effect(() => child.webServer.register({
      kind: 'exact',
      path: '/aurora/pet.png',
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        let bytes
        try {
          bytes = readFileSync(fileURLToPath(PET))
        } catch {
          res.writeHead(404, { 'cache-control': 'no-store' })
          res.end()
          return
        }
        res.writeHead(200, {
          'content-type': 'image/png',
          'content-length': bytes.byteLength,
          'cache-control': 'public, max-age=3600',
          'x-content-type-options': 'nosniff',
        })
        res.end(req.method === 'HEAD' ? undefined : bytes)
      },
    }))

    child.effect(() => child.webServer.register({
      kind: 'exact',
      path: '/aurora/ping',
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD', 'cache-control': 'no-store' })
          res.end()
          return
        }
        res.writeHead(204, { 'cache-control': 'no-store' })
        res.end()

        if (!isLoopback(req)) return
        const now = Date.now()
        if (now - lastPing < PING_INTERVAL_MS) return
        lastPing = now

        // Reduce the payload to a short token: no CR/LF, no escape sequences.
        const raw = new URL(req.url ?? '/', 'http://local').searchParams.get('loaded') ?? ''
        const token = raw.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64)
        if (token.length === 0) return
        if (ctx.logger !== undefined && typeof ctx.logger.debug === 'function') {
          ctx.logger.debug(`aurora: client ping ${token}`)
        }
        note(`client ping ${token}`)
      },
    }))
  })
}
