/* Aurora overlay: theme controls + the DeepSeek-chan desktop pet.
 *
 * This file is embedded verbatim inside the generated browser half
 * (tools/build.mjs). It runs in the GUI renderer and assumes `React` is in
 * scope. No framework components are imported: everything is plain JSX-free
 * React plus the skin's own CSS classes.
 */

const STORE_KEY = 'aurora.knobs.v1'
const PET_KEY = 'aurora.pet.v1'

const PRESETS = [
  { id: 'jade', label: '青玉', accent: '#4fb59a', accent2: '#8ee0c8' },
  { id: 'sakura', label: '樱粉', accent: '#e88aa8', accent2: '#ffc2d4' },
  { id: 'amber', label: '琥珀', accent: '#d99a5b', accent2: '#f3c98b' },
  { id: 'sky', label: '天青', accent: '#5b9bd5', accent2: '#a5cdf0' },
  { id: 'graphite', label: '石墨', accent: '#8d97a8', accent2: '#c3cbd8' },
]

const DEFAULT_KNOBS = { accent: '#4fb59a', accent2: '#8ee0c8', blur: 26, glass: 1, motion: 'full' }

const LINES = [
  '在的～',
  '写完这段就休息一下吧',
  '今天的 bug 也会自己跑掉的',
  '要我陪你一起想吗？',
  '别忘了喝水哦',
  '摸鱼也是生产力',
  '摸摸头 ✧',
]

/** Clamp helper kept local so the overlay never trusts stored values. */
function clamp(value, min, max, fallback) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or quota: the skin still works for this page view */
  }
}

/** Sanitize a knob set coming from storage or the plugin config. */
function normalizeKnobs(input, fallback) {
  const source = input && typeof input === 'object' ? input : {}
  const base = fallback || DEFAULT_KNOBS
  const hex = (value, previous) => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : previous)
  return {
    accent: hex(source.accent, base.accent),
    accent2: hex(source.accent2, base.accent2),
    blur: Math.round(clamp(source.blur, 0, 60, base.blur)),
    glass: clamp(source.glass, 0.2, 1, base.glass),
    motion: source.motion === 'none' || source.motion === 'subtle' || source.motion === 'full' ? source.motion : base.motion,
  }
}

/** Push knobs into the document as custom properties. */
function applyKnobs(knobs) {
  const root = document.documentElement
  root.style.setProperty('--aurora-accent', knobs.accent)
  root.style.setProperty('--aurora-accent-2', knobs.accent2)
  root.style.setProperty('--aurora-glass-blur', knobs.blur + 'px')
  root.style.setProperty('--aurora-glass', String(knobs.glass))
  root.style.setProperty('--aurora-anim', knobs.motion === 'none' ? 'none' : 'aurora-drift')
  root.style.setProperty('--aurora-drift', knobs.motion === 'subtle' ? '96s' : '54s')
  root.style.setProperty('--aurora-drift-opacity', knobs.motion === 'none' ? '0' : knobs.motion === 'subtle' ? '0.3' : '0.42')
  root.setAttribute('data-aurora-motion', knobs.motion)
}

function PetWhale() {
  return React.createElement('svg', { viewBox: '0 0 120 120', className: 'aurora-pet-svg', 'aria-hidden': 'true' },
    React.createElement('defs', null,
      React.createElement('linearGradient', { id: 'auroraHair', x1: '0', y1: '0', x2: '0', y2: '1' },
        React.createElement('stop', { offset: '0', stopColor: '#7fd6d0' }),
        React.createElement('stop', { offset: '1', stopColor: '#2f7f9e' })),
      React.createElement('linearGradient', { id: 'auroraHoodie', x1: '0', y1: '0', x2: '0', y2: '1' },
        React.createElement('stop', { offset: '0', stopColor: '#fdfefe' }),
        React.createElement('stop', { offset: '1', stopColor: '#dfe9f2' })),
    ),
    // tail (whale motif) behind the body
    React.createElement('path', {
      className: 'aurora-pet-tail',
      d: 'M86 84c10-6 18-3 22 4-8 1-12 5-13 11-5-4-8-9-9-15z',
      fill: '#8fd8e6',
      opacity: '0.9',
    }),
    // body
    React.createElement('path', {
      d: 'M38 96c-6-12-8-24-6-34 2-12 12-18 28-18s26 6 28 18c2 10 0 22-6 34-4 8-12 12-22 12s-18-4-22-12z',
      fill: 'url(#auroraHoodie)',
      stroke: '#c8d8e6',
      strokeWidth: '1.2',
    }),
    // hoodie pocket line
    React.createElement('path', { d: 'M48 92h24', stroke: '#cfdde9', strokeWidth: '2', strokeLinecap: 'round' }),
    // head
    React.createElement('circle', { cx: '60', cy: '46', r: '26', fill: '#ffe9df', stroke: '#f3cdbd', strokeWidth: '1.2' }),
    // hair back
    React.createElement('path', {
      d: 'M34 44c0-16 11-26 26-26s26 10 26 26c0 8-3 14-7 18 1-12-4-20-19-20s-20 8-19 20c-4-4-7-10-7-18z',
      fill: 'url(#auroraHair)',
    }),
    // bangs
    React.createElement('path', {
      d: 'M38 42c3-9 11-14 22-14s19 5 22 14c-5-3-9-4-13-3-3 4-6 6-9 6s-6-2-9-6c-4-1-8 0-13 3z',
      fill: 'url(#auroraHair)',
    }),
    // whale-tail ahoge
    React.createElement('path', { d: 'M60 20c1-6 5-9 9-9-3 3-3 6-2 9-3-1-5-1-7 0z', fill: '#8fd8e6' }),
    // eyes
    React.createElement('g', { className: 'aurora-pet-eyes' },
      React.createElement('ellipse', { cx: '51', cy: '50', rx: '4.2', ry: '5.4', fill: '#22303f' }),
      React.createElement('ellipse', { cx: '69', cy: '50', rx: '4.2', ry: '5.4', fill: '#22303f' }),
      React.createElement('circle', { cx: '52.6', cy: '48.2', r: '1.5', fill: '#ffffff' }),
      React.createElement('circle', { cx: '70.6', cy: '48.2', r: '1.5', fill: '#ffffff' })),
    // blush
    React.createElement('ellipse', { cx: '43', cy: '58', rx: '4.4', ry: '2.6', fill: '#ffb3c1', opacity: '0.7' }),
    React.createElement('ellipse', { cx: '77', cy: '58', rx: '4.4', ry: '2.6', fill: '#ffb3c1', opacity: '0.7' }),
    // mouth
    React.createElement('path', { d: 'M57 60c1.4 2 4.6 2 6 0', stroke: '#c4707f', strokeWidth: '1.6', strokeLinecap: 'round', fill: 'none' }),
    // arms: one waving
    React.createElement('g', { className: 'aurora-pet-wave' },
      React.createElement('rect', { x: '27', y: '86', width: '9', height: '20', rx: '4.5', fill: '#fdfefe', stroke: '#c8d8e6', strokeWidth: '1.1' })),
    React.createElement('rect', { x: '84', y: '88', width: '9', height: '18', rx: '4.5', fill: '#fdfefe', stroke: '#c8d8e6', strokeWidth: '1.1' }),
  )
}

/** Community whale-girl sprite, served by the host at /aurora/pet.png. */
function PetSprite() {
  const [failed, setFailed] = React.useState(false)
  if (failed) return React.createElement(PetWhale, null)
  return React.createElement('img', {
    className: 'aurora-pet-img',
    src: '/aurora/pet.png',
    alt: '',
    draggable: false,
    onError: () => setFailed(true),
  })
}

function ControlRow({ label, value, children }) {
  return React.createElement('div', { className: 'aurora-row' },
    React.createElement('span', { className: 'aurora-row-label' }, label),
    children,
    React.createElement('span', { className: 'aurora-row-value' }, value))
}

/**
 * Build the frame-wide overlay component.
 * @param config - validated-ish plugin config used as the knob defaults.
 */
function createOverlay(config) {
  const configDefaults = normalizeKnobs(config, DEFAULT_KNOBS)
  return function AuroraOverlay() {
    const [knobs, setKnobs] = React.useState(() => normalizeKnobs(readStore(STORE_KEY, {}), configDefaults))
    const [open, setOpen] = React.useState(false)
    const [line, setLine] = React.useState('在的～')
    const [pet, setPet] = React.useState(() => {
      const saved = readStore(PET_KEY, {})
      return { right: clamp(saved.right, 8, 400, 32), bottom: clamp(saved.bottom, 8, 400, 96) }
    })
    const dragRef = React.useRef(null)

    React.useEffect(() => { applyKnobs(knobs) }, [knobs])
    React.useEffect(() => { writeStore(STORE_KEY, knobs) }, [knobs])
    React.useEffect(() => { writeStore(PET_KEY, pet) }, [pet])

    // Drag the pet with pointer capture; the offset is clamped to the window.
    const onPointerDown = (event) => {
      event.preventDefault()
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        right: pet.right,
        bottom: pet.bottom,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event) => {
      const drag = dragRef.current
      if (!drag) return
      setPet({
        right: clamp(drag.right - (event.clientX - drag.startX), 8, window.innerWidth - 120, 32),
        bottom: clamp(drag.bottom - (event.clientY - drag.startY), 8, window.innerHeight - 120, 96),
      })
    }
    const onPointerUp = () => { dragRef.current = null }

    const speak = () => {
      const next = LINES[Math.floor(Math.random() * LINES.length)]
      setLine(next)
      setOpen(false)
    }

    const patch = (next) => setKnobs((current) => normalizeKnobs({ ...current, ...next }, current))

    const panel = open && React.createElement('div', { className: 'aurora-panel', role: 'dialog', 'aria-label': '外观' },
      React.createElement('div', { className: 'aurora-panel-title' },
        React.createElement('span', null, '外观'),
        React.createElement('button', { className: 'aurora-close', onClick: () => setOpen(false), 'aria-label': '关闭' }, '×')),
      React.createElement('div', { className: 'aurora-swatches' },
        PRESETS.map((preset) => React.createElement('button', {
          key: preset.id,
          className: 'aurora-swatch' + (knobs.accent === preset.accent ? ' is-active' : ''),
          title: preset.label,
          'aria-label': preset.label,
          style: { background: 'linear-gradient(135deg, ' + preset.accent + ', ' + preset.accent2 + ')' },
          onClick: () => patch({ accent: preset.accent, accent2: preset.accent2 }),
        }))),
      React.createElement(ControlRow, { label: '磨砂', value: knobs.blur + 'px' },
        React.createElement('input', {
          className: 'aurora-range', type: 'range', min: '0', max: '60', step: '1', value: knobs.blur,
          onChange: (event) => patch({ blur: event.target.value }),
        })),
      React.createElement(ControlRow, { label: '通透', value: Math.round(knobs.glass * 100) + '%' },
        React.createElement('input', {
          className: 'aurora-range', type: 'range', min: '20', max: '100', step: '1', value: Math.round(knobs.glass * 100),
          onChange: (event) => patch({ glass: Number(event.target.value) / 100 }),
        })),
      React.createElement('div', { className: 'aurora-segment' },
        [['full', '灵动'], ['subtle', '微光'], ['none', '静止']].map(([value, label]) =>
          React.createElement('button', {
            key: value,
            className: 'aurora-seg' + (knobs.motion === value ? ' is-active' : ''),
            onClick: () => patch({ motion: value }),
          }, label))),
      React.createElement('button', {
        className: 'aurora-reset',
        onClick: () => setKnobs(configDefaults),
      }, '恢复默认'))

    return React.createElement('div', { className: 'aurora-layer' },
      React.createElement('button', {
        className: 'aurora-launcher' + (open ? ' is-open' : ''),
        'aria-label': '外观与桌宠',
        title: '外观与桌宠',
        onClick: () => setOpen((value) => !value),
      }, '✦'),
      panel,
      React.createElement('div', {
        className: 'aurora-pet' + (open ? ' is-hidden' : ''),
        style: { right: pet.right + 'px', bottom: pet.bottom + 'px' },
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
        onClick: speak,
        role: 'button',
        tabIndex: 0,
        onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') speak() },
        'aria-label': 'DeepSeek 娘',
        title: '点我',
      },
        React.createElement('div', { className: 'aurora-bubble' }, line),
        React.createElement('div', { className: 'aurora-pet-body' }, React.createElement(PetSprite, null)),
      ))
  }
}

/** Register the overlay on the frame-wide slot. */
function mountOverlay(ctx, config) {
  const Overlay = createOverlay(config)
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'aurora',
    order: 90,
  }, Overlay))
}

/**
 * Mount the overlay on the slot registry the plugin declared in `inject`.
 * @param ctx - client root context (carries `slots`).
 * @param config - plugin entry config.
 */
function mountControls(ctx, config) {
  const slots = ctx.slots
  if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
  mountOverlay({ slots }, config)
}
