/**
 * Aurora — host half of a skin for the DeepSeek Harness web GUI.
 *
 * The plugin contributes one `style` row to every served index.html. The
 * stylesheet is read from `lib/aurora.css` at render time, so an edit only
 * needs a page refresh; no client bundle is shipped.
 *
 * Selectors in the stylesheet are scoped to `html body` because they must
 * outrank the palette rules the client bundle appends later in <head>.
 *
 * `lib/activity.log` records activation and disposal so an apply/revert script
 * can prove the running host picked the change up. It is diagnostics only and
 * never allowed to break the UI.
 */
import { appendFileSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const name = 'theme-aurora'

const STYLESHEET = new URL('./aurora.css', import.meta.url)
const ACTIVITY = new URL('./activity.log', import.meta.url)
const STYLE_CLOSE = '</style'

let cache = { mtimeMs: -1, css: '' }

/** Append one activation line; diagnostics must never throw into the host. */
function note(line) {
  try {
    appendFileSync(fileURLToPath(ACTIVITY), `${new Date().toISOString()} ${line}\n`)
  } catch {
    /* read-only install or a locked log: the skin itself still works. */
  }
}

/** Read the stylesheet, re-reading it only when its mtime moves. */
function stylesheet() {
  const file = fileURLToPath(STYLESHEET)
  const { mtimeMs } = statSync(file)
  if (mtimeMs !== cache.mtimeMs) {
    cache = { mtimeMs, css: readFileSync(file, 'utf8') }
  }
  // A raw `</style` inside the text would close the element it is written into.
  return cache.css.replaceAll(STYLE_CLOSE, '<\\/style')
}

export function apply(ctx) {
  note(`apply pid=${process.pid}`)
  ctx.on('dispose', () => note(`dispose pid=${process.pid}`))
  ctx.on('webserver/index-inject', (table) => {
    table.push({ kind: 'style', text: stylesheet() })
  })
}
