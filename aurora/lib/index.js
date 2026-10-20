/**
 * Aurora — host half of the main package.
 *
 * Serves the skin to browser clients:
 *  - `webserver/index-inject` pastes the stylesheet into served index.html so a
 *    browser tab is styled on first paint;
 *  - `/aurora/theme.css` serves the same stylesheet live, which the browser
 *    half fetches to hot-reload CSS edits.
 *
 * The Desktop renderer boots from a static index inside app.asar and never sees
 * index injections; its browser half fetches `/aurora/theme.css` instead.
 *
 * Config knobs (optional): accent, accent2, blur, glass, motion. Values are
 * validated and only ever emitted as literals.
 */
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const name = 'theme-aurora'

const STYLESHEET = new URL('./aurora.css', import.meta.url)
const STYLE_CLOSE = /<\/style/gi

const HEX = /^#[0-9a-fA-F]{6}$/
const MOTIONS = new Set(['full', 'subtle', 'none'])
const DEFAULTS = Object.freeze({ accent: '#4fb59a', accent2: '#8ee0c8', blur: 26, glass: 1, motion: 'full' })

let cache = { key: '', css: '' }

/** Own-property read that survives null/odd config objects. */
function own(object, key) {
  return object !== null && typeof object === 'object' && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined
}

/** Validate one knob; anything unexpected falls back to the default. */
export function readKnobs(config) {
  const source = config === null || typeof config !== 'object' ? {} : config
  const pick = (value, fallback) => (typeof value === 'string' && HEX.test(value.trim()) ? value.trim() : fallback)
  const clamp = (value, min, max, fallback) => {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
  }
  return {
    accent: pick(own(source, 'accent'), DEFAULTS.accent),
    accent2: pick(own(source, 'accent2'), DEFAULTS.accent2),
    blur: clamp(own(source, 'blur'), 0, 60, DEFAULTS.blur),
    glass: clamp(own(source, 'glass'), 0.2, 1, DEFAULTS.glass),
    motion: MOTIONS.has(own(source, 'motion')) ? own(source, 'motion') : DEFAULTS.motion,
  }
}

/** Render validated knobs as a custom-property block. */
export function knobVars(knobs) {
  const anim = knobs.motion === 'none' ? 'none' : 'aurora-drift'
  const drift = knobs.motion === 'subtle' ? '96s' : '54s'
  const glow = knobs.motion === 'none' ? '0' : knobs.motion === 'subtle' ? '0.3' : '0.42'
  return [
    ':root{',
    `--aurora-accent:${knobs.accent};`,
    `--aurora-accent-2:${knobs.accent2};`,
    `--aurora-glass-blur:${knobs.blur}px;`,
    `--aurora-glass:${knobs.glass};`,
    `--aurora-anim:${anim};`,
    `--aurora-drift:${drift};`,
    `--aurora-drift-opacity:${glow};`,
    '}',
  ].join('')
}

/**
 * Read the stylesheet with a last-good fallback. A missing or unreadable file
 * must never take the index down: the previous copy keeps the skin alive.
 */
function stylesheet() {
  const file = fileURLToPath(STYLESHEET)
  try {
    const stat = statSync(file)
    const key = `${stat.mtimeMs}:${stat.size}`
    if (key !== cache.key) {
      const text = readFileSync(file, 'utf8')
      if (text.trim().length > 0) cache = { key, css: text }
    }
  } catch {
    /* keep the last good copy; an empty cache means "no skin" */
  }
  // `</style` in any case would close the element the host writes this into.
  return cache.css.replace(STYLE_CLOSE, '<\\/style')
}

export function apply(ctx, config) {
  const knobs = readKnobs(config)
  const themed = () => `${stylesheet()}\n${knobVars(knobs)}`

  ctx.on('webserver/index-inject', (table) => {
    try {
      const text = themed()
      if (text.trim().length > 0) table.push({ kind: 'style', text })
    } catch {
      /* never fail an index render because of the skin */
    }
  })

  ctx.inject(['webServer'], (child) => {
    child.effect(() => child.webServer.register({
      kind: 'exact',
      path: '/aurora/theme.css',
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        const text = themed()
        if (text.trim().length === 0) {
          res.writeHead(503, { 'cache-control': 'no-store' })
          res.end()
          return
        }
        res.writeHead(200, {
          'content-type': 'text/css; charset=utf-8',
          'content-length': Buffer.byteLength(text),
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        })
        res.end(req.method === 'HEAD' ? undefined : text)
      },
    }))
  })
}
