/* Liuguang overlay: personalization panel + the DeepSeek-chan pet.
 *
 * Embedded verbatim inside the generated browser half (tools/build.mjs); runs
 * in the GUI renderer and assumes `React` is in scope. No UI framework imports:
 * plain React plus the skin's own CSS classes.
 */

const STORE_KEY = 'liuguang.knobs.v2'
const PET_KEY = 'liuguang.pet.v1'

const PRESETS = [
  { id: 'jade', label: '青玉', accent: '#4fb59a', accent2: '#8ee0c8' },
  { id: 'sakura', label: '樱粉', accent: '#e88aa8', accent2: '#ffc2d4' },
  { id: 'amber', label: '琥珀', accent: '#d99a5b', accent2: '#f3c98b' },
  { id: 'sky', label: '天青', accent: '#5b9bd5', accent2: '#a5cdf0' },
  { id: 'graphite', label: '石墨', accent: '#8d97a8', accent2: '#c3cbd8' },
]

/** Spot inks for the constructivist language (print shop palette). */
const SPOTS = [
  { id: 'red', label: '血红', color: '#c0301c' },
  { id: 'vermilion', label: '朱砂', color: '#d4542f' },
  { id: 'ochre', label: '赭石', color: '#b5721f' },
  { id: 'prussian', label: '普鲁士蓝', color: '#1f4e79' },
  { id: 'ink', label: '墨', color: '#141414' },
]

/** Expression pack: sprites served from /liuguang/pet/<name>.png. */
const EXPRESSIONS = {
  wave: { label: '招呼', lines: ['在的～', '今天也要加油哦', '需要我做什么吗？'] },
  done: { label: '完成', lines: ['搞定！', '交付完成 ✧', '这一段写得很漂亮'] },
  surprised: { label: '惊讶', lines: ['诶？！', '这个 bug 有点意思', '等等，我看看…'] },
  pout: { label: '鼓气', lines: ['唔…又报错了', '再试一次嘛', '不许熬夜！'] },
  task: { label: '待命', lines: ['收到任务', '开始干活', '给我点时间'] },
  slack: { label: '摸鱼', lines: ['摸一会儿鱼', '喝口水再继续', '偷懒也是生产力'] },
  sleepy: { label: '犯困', lines: ['好困…', '让我眯一会儿', 'zzz…'] },
}

const DEFAULT_KNOBS = {
  language: 'glass',
  style: 'graphite',
  pack: '',
  accent: '#c8b48a',
  accent2: '#eadfc8',
  blur: 26,
  glass: 1,
  motion: 'full',
  radius: 24,
  // Constructivist print-shop knobs (independent of the glass material knobs).
  paper: 'cream',
  spot: 'red',
  grid: 'fine',
  poster: '01',
  stamp: 'on',
  motif: 'ring',
  tracking: 'normal',
  measure: 'wide',
  rules: 'off',
  num: 'black',
  weight: 'normal',
  petScale: 1,
  chatty: 2,
  petVisible: true,
}

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
    /* private mode / quota: the skin still works for this page view */
  }
}

/** Sanitize a knob set coming from storage or the plugin config. */
function normalizeKnobs(input, fallback) {
  const source = input && typeof input === 'object' ? input : {}
  const base = fallback || DEFAULT_KNOBS
  const hex = (value, previous) => (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim() : previous)
  const pick = (value, allowed, previous) => (allowed.indexOf(value) >= 0 ? value : previous)
  return {
    language: pick(source.language, ['glass', 'constructivist'], base.language),
    style: pick(source.style, ['graphite', 'ocean', 'sand'], base.style),
    pack: typeof source.pack === 'string' && (source.pack === '' || /^[a-z0-9][a-z0-9-]{0,31}$/.test(source.pack))
      ? source.pack
      : base.pack,
    accent: hex(source.accent, base.accent),
    accent2: hex(source.accent2, base.accent2),
    blur: Math.round(clamp(source.blur, 0, 60, base.blur)),
    glass: clamp(source.glass, 0.2, 1, base.glass),
    motion: pick(source.motion, ['full', 'subtle', 'none'], base.motion),
    radius: Math.round(clamp(source.radius, 12, 32, base.radius)),
    paper: pick(source.paper, ['cream', 'ash', 'kraft', 'blue'], base.paper),
    spot: pick(source.spot, ['red', 'vermilion', 'ochre', 'prussian', 'ink'], base.spot),
    grid: pick(source.grid, ['none', 'fine', 'bold'], base.grid),
    poster: pick(source.poster, ['off', '01', '02', '03'], base.poster),
    stamp: pick(source.stamp, ['on', 'off'], base.stamp),
    motif: pick(source.motif, ['ring', 'diagonal', 'none'], base.motif),
    tracking: pick(source.tracking, ['tight', 'normal', 'wide'], base.tracking),
    measure: pick(source.measure, ['wide', 'mid', 'narrow'], base.measure),
    rules: pick(source.rules, ['off', 'on'], base.rules),
    num: pick(source.num, ['black', 'mono', 'serif'], base.num),
    weight: pick(source.weight, ['light', 'normal', 'strong'], base.weight),
    petScale: clamp(source.petScale, 0.8, 1.4, base.petScale),
    chatty: Math.round(clamp(source.chatty, 0, 2, base.chatty)),
    petVisible: typeof source.petVisible === 'boolean' ? source.petVisible : base.petVisible,
  }
}

/** Push knobs into the document as custom properties. */
function applyKnobs(knobs) {
  const root = document.documentElement
  root.setAttribute('data-lg-language', knobs.language)
  root.setAttribute('data-lg-style', knobs.style)
  root.style.setProperty('--lg-accent', knobs.accent)
  root.style.setProperty('--lg-accent-2', knobs.accent2)
  root.style.setProperty('--lg-glass-blur', knobs.blur + 'px')
  root.style.setProperty('--lg-glass', String(knobs.glass))
  root.style.setProperty('--lg-radius', knobs.radius + 'px')
  root.style.setProperty('--lg-pet-scale', String(knobs.petScale))
  root.style.setProperty('--lg-anim', knobs.motion === 'none' ? 'none' : 'liuguang-drift')
  root.style.setProperty('--lg-drift', knobs.motion === 'subtle' ? '96s' : '54s')
  // Drift opacity stays CSS-owned so each base style keeps its own glow level;
  // `data-lg-motion` scales it instead of overwriting it.
  root.setAttribute('data-lg-motion', knobs.motion)

  // Constructivist print-shop axes: paper stock, spot ink, grid, poster number,
  // corner stamp, geometric motif and display tracking. All CSS-owned.
  root.setAttribute('data-lg-paper', knobs.paper)
  root.setAttribute('data-lg-spot', knobs.spot)
  root.setAttribute('data-lg-grid', knobs.grid)
  root.setAttribute('data-lg-poster', knobs.poster)
  root.setAttribute('data-lg-stamp', knobs.stamp)
  root.setAttribute('data-lg-motif', knobs.motif)
  root.setAttribute('data-lg-tracking', knobs.tracking)
  root.setAttribute('data-lg-measure', knobs.measure)
  root.setAttribute('data-lg-rules', knobs.rules)
  root.setAttribute('data-lg-num', knobs.num)
  root.setAttribute('data-lg-weight', knobs.weight)
  root.style.setProperty('--lg-no', '"' + (knobs.poster === 'off' ? '01' : knobs.poster) + '"')
}

function PetWhale() {
  return React.createElement('svg', { viewBox: '0 0 120 120', className: 'lg-pet-svg', 'aria-hidden': 'true' },
    React.createElement('ellipse', { cx: '60', cy: '102', rx: '26', ry: '6', fill: 'rgba(10,20,30,0.25)' }),
    React.createElement('circle', { cx: '60', cy: '58', r: '30', fill: '#e9f6ff', stroke: '#9cc7dd', strokeWidth: '2' }),
    React.createElement('circle', { cx: '49', cy: '54', r: '5', fill: '#22303f' }),
    React.createElement('circle', { cx: '71', cy: '54', r: '5', fill: '#22303f' }),
    React.createElement('circle', { cx: '50.6', cy: '52', r: '1.6', fill: '#fff' }),
    React.createElement('circle', { cx: '72.6', cy: '52', r: '1.6', fill: '#fff' }),
    React.createElement('path', { d: 'M56 68c2 3 6 3 8 0', stroke: '#7a8fa0', strokeWidth: '2', fill: 'none', strokeLinecap: 'round' }),
    React.createElement('path', { d: 'M32 52c-8-2-12 4-12 4 4 4 9 4 13 1z', fill: '#b9dcec' }),
    React.createElement('path', { d: 'M88 52c8-2 12 4 12 4-4 4-9 4-13 1z', fill: '#b9dcec' }),
  )
}

/** Expression sprite with an SVG fallback if an asset is missing. */
function PetSprite({ expression }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return React.createElement(PetWhale, null)
  return React.createElement('img', {
    className: 'lg-pet-img',
    src: '/liuguang/pet/' + expression + '.png',
    alt: '',
    draggable: false,
    onError: () => setFailed(true),
  })
}

function ControlRow({ label, value, children }) {
  return React.createElement('div', { className: 'lg-row' },
    React.createElement('span', { className: 'lg-row-label' }, label),
    children,
    React.createElement('span', { className: 'lg-row-value' }, value))
}

/**
 * Build the frame-wide overlay component.
 * @param config - plugin entry config used as the knob defaults.
 */
function createOverlay(config) {
  const configDefaults = normalizeKnobs(config, DEFAULT_KNOBS)
  return function LiuguangOverlay() {
    const [knobs, setKnobs] = React.useState(function () { return normalizeKnobs(readStore(STORE_KEY, {}), configDefaults) })
    const [open, setOpen] = React.useState(false)
    const [tab, setTab] = React.useState('look')
    const [expression, setExpression] = React.useState('wave')
    const [line, setLine] = React.useState('')
    const [pet, setPet] = React.useState(function () {
      const saved = readStore(PET_KEY, {})
      return { right: clamp(saved.right, 8, 400, 32), bottom: clamp(saved.bottom, 8, 400, 120) }
    })
    const dragRef = React.useRef(null)
    const idleTimer = React.useRef(null)
    const lineTimer = React.useRef(null)
    const [packs, setPacks] = React.useState([])
    const [packProblems, setPackProblems] = React.useState(0)

    React.useEffect(function () { applyKnobs(knobs) }, [knobs])
    React.useEffect(function () { writeStore(STORE_KEY, knobs) }, [knobs])
    React.useEffect(function () { writeStore(PET_KEY, pet) }, [pet])

    // Discover drop-in skin packs (`<DSH_HOME>/lg-packs/<id>/`).
    React.useEffect(function () {
      let alive = true
      fetch('/liuguang/packs', { cache: 'no-store' })
        .then(function (response) { return response.ok ? response.json() : null })
        .then(function (data) {
          if (!alive || data === null || typeof data !== 'object') return
          if (Array.isArray(data.packs)) setPacks(data.packs.filter(function (pack) { return pack && typeof pack.id === 'string' }))
          if (Array.isArray(data.problems)) setPackProblems(data.problems.length)
        })
        .catch(function () { /* packs are optional */ })
      return function () { alive = false }
    }, [])

    // A selected pack is a stylesheet appended after the skin, so it can
    // override tokens without being able to run script.
    React.useEffect(function () {
      const existing = document.getElementById('liuguang-pack')
      if (existing) existing.remove()
      if (!knobs.pack) return
      const link = document.createElement('link')
      link.id = 'liuguang-pack'
      link.rel = 'stylesheet'
      link.href = '/liuguang/packs/' + knobs.pack + '.css?v=' + Date.now()
      document.head.appendChild(link)
    }, [knobs.pack])

    // Specular highlight follows the pointer across the glass.
    React.useEffect(function () {
      let frame = 0
      const onMove = function (event) {
        if (frame) return
        frame = window.requestAnimationFrame(function () {
          frame = 0
          const root = document.documentElement
          root.style.setProperty('--lg-mx', event.clientX + 'px')
          root.style.setProperty('--lg-my', event.clientY + 'px')
        })
      }
      window.addEventListener('pointermove', onMove, { passive: true })
      return function () {
        window.removeEventListener('pointermove', onMove)
        if (frame) window.cancelAnimationFrame(frame)
        const root = document.documentElement
        root.style.removeProperty('--lg-mx')
        root.style.removeProperty('--lg-my')
        root.removeAttribute('data-lg-motion')
      }
    }, [])

    // Idle → sleepy; any interaction wakes her up.
    const armIdle = React.useCallback(function () {
      window.clearTimeout(idleTimer.current)
      idleTimer.current = window.setTimeout(function () { setExpression('sleepy') }, 90000)
    }, [])
    React.useEffect(function () {
      armIdle()
      return function () { window.clearTimeout(idleTimer.current) }
    }, [armIdle])

    const speak = function (key) {
      const entry = EXPRESSIONS[key] || EXPRESSIONS.wave
      const pick = entry.lines[Math.floor(Math.random() * entry.lines.length)]
      setExpression(key)
      setLine(pick)
      window.clearTimeout(lineTimer.current)
      lineTimer.current = window.setTimeout(function () { setLine('') }, 4200)
      armIdle()
    }

    const react = function () {
      const keys = ['done', 'surprised', 'pout', 'task', 'slack']
      speak(keys[Math.floor(Math.random() * keys.length)])
    }

    const onPointerDown = function (event) {
      event.preventDefault()
      dragRef.current = { startX: event.clientX, startY: event.clientY, right: pet.right, bottom: pet.bottom }
      event.currentTarget.setPointerCapture(event.pointerId)
      armIdle()
    }
    const onPointerMove = function (event) {
      const drag = dragRef.current
      if (!drag) return
      setPet({
        right: clamp(drag.right - (event.clientX - drag.startX), 8, window.innerWidth - 140, 32),
        bottom: clamp(drag.bottom - (event.clientY - drag.startY), 8, window.innerHeight - 140, 120),
      })
    }
    const onPointerUp = function () { dragRef.current = null }

    const patch = function (next) {
      setKnobs(function (current) { return normalizeKnobs(Object.assign({}, current, next), current) })
    }
    const tabButton = function (id, label) {
      return React.createElement('button', {
        key: id,
        className: 'lg-tab' + (tab === id ? ' is-active' : ''),
        onClick: function () { setTab(id) },
      }, label)
    }

    // A compact "label + segmented control" row, shared by both languages.
    const segRow = function (label, options, current, toPatch) {
      return React.createElement('div', { className: 'lg-inline' },
        React.createElement('span', { className: 'lg-row-label' }, label),
        React.createElement('div', { className: 'lg-segment' },
          options.map(function (pair) {
            return React.createElement('button', {
              key: pair[0],
              className: 'lg-seg' + (current === pair[0] ? ' is-active' : ''),
              onClick: function () { patch(toPatch(pair[0])) },
            }, pair[1])
          })))
    }

    const languageRow = React.createElement('div', { className: 'lg-inline' },
      React.createElement('span', { className: 'lg-row-label' }, '设计语言'),
      React.createElement('div', { className: 'lg-segment' },
        [['glass', '液态玻璃'], ['constructivist', '构成主义']].map(function (pair) {
          return React.createElement('button', {
            key: pair[0],
            className: 'lg-seg' + (knobs.language === pair[0] ? ' is-active' : ''),
            onClick: function () { patch({ language: pair[0] }) },
          }, pair[1])
        })))

    const packsRow = packs.length > 0 && React.createElement('div', { className: 'lg-packs' },
      React.createElement('span', { className: 'lg-packs-label' }, '皮肤包'),
      React.createElement('div', { className: 'lg-packs-list' },
        [{ id: '', name: '不使用' }].concat(packs).map(function (pack) {
          return React.createElement('button', {
            key: pack.id === '' ? '__none' : pack.id,
            className: 'lg-pack-chip' + (knobs.pack === pack.id ? ' is-active' : ''),
            title: pack.desc || pack.name,
            onClick: function () { patch({ pack: pack.id }) },
          }, pack.name)
        })))

    // Glass controls: material knobs (blur / translucency / radius / motion).
    const glassControls = React.createElement('div', { className: 'lg-section' },
      React.createElement('div', { className: 'lg-segment' },
        [['graphite', '墨银'], ['ocean', '深海'], ['sand', '暖砂']].map(function (pair) {
          return React.createElement('button', {
            key: pair[0],
            className: 'lg-seg' + (knobs.style === pair[0] ? ' is-active' : ''),
            onClick: function () { patch({ style: pair[0] }) },
          }, pair[1])
        })),
      React.createElement('div', { className: 'lg-swatches' },
        PRESETS.map(function (preset) {
          return React.createElement('button', {
            key: preset.id,
            className: 'lg-swatch' + (knobs.accent === preset.accent ? ' is-active' : ''),
            title: preset.label,
            'aria-label': preset.label,
            style: { background: 'linear-gradient(135deg, ' + preset.accent + ', ' + preset.accent2 + ')' },
            onClick: function () { patch({ accent: preset.accent, accent2: preset.accent2 }) },
          })
        }),
        React.createElement('label', { className: 'lg-custom', title: '自定义强调色' },
          React.createElement('input', {
            type: 'color', value: knobs.accent,
            onChange: function (event) { patch({ accent: event.target.value }) },
          }),
          React.createElement('span', null, '自定义'))),
      React.createElement(ControlRow, { label: '磨砂', value: knobs.blur + 'px' },
        React.createElement('input', {
          className: 'lg-range', type: 'range', min: '0', max: '60', step: '1', value: knobs.blur,
          onChange: function (event) { patch({ blur: event.target.value }) },
        })),
      React.createElement(ControlRow, { label: '通透', value: Math.round(knobs.glass * 100) + '%' },
        React.createElement('input', {
          className: 'lg-range', type: 'range', min: '20', max: '100', step: '1', value: Math.round(knobs.glass * 100),
          onChange: function (event) { patch({ glass: Number(event.target.value) / 100 }) },
        })),
      React.createElement(ControlRow, { label: '圆角', value: knobs.radius + 'px' },
        React.createElement('input', {
          className: 'lg-range', type: 'range', min: '12', max: '32', step: '1', value: knobs.radius,
          onChange: function (event) { patch({ radius: event.target.value }) },
        })),
      segRow('动效', [['full', '灵动'], ['subtle', '微光'], ['none', '静止']], knobs.motion, function (value) { return { motion: value } }))

    // Constructivist controls: print-shop decisions, not material knobs.
    const groupLabel = function (text) {
      return React.createElement('span', { className: 'lg-group-label' }, text)
    }
    const posterControls = React.createElement('div', { className: 'lg-section' },
      groupLabel('版面'),
      segRow('纸张', [['cream', '米白'], ['ash', '灰白'], ['kraft', '牛皮'], ['blue', '蓝图纸']], knobs.paper, function (value) { return { paper: value } }),
      React.createElement('div', { className: 'lg-inline' },
        React.createElement('span', { className: 'lg-row-label' }, '套色'),
        React.createElement('div', { className: 'lg-swatches lg-swatches-inline' },
          SPOTS.map(function (spot) {
            return React.createElement('button', {
              key: spot.id,
              className: 'lg-swatch lg-swatch-flat' + (knobs.spot === spot.id ? ' is-active' : ''),
              title: spot.label,
              'aria-label': spot.label,
              style: { background: spot.color },
              onClick: function () { patch({ spot: spot.id }) },
            })
          }))),
      segRow('网格', [['none', '无'], ['fine', '细'], ['bold', '粗']], knobs.grid, function (value) { return { grid: value } }),
      segRow('版心', [['wide', '宽'], ['mid', '中'], ['narrow', '窄']], knobs.measure, function (value) { return { measure: value } }),
      segRow('分栏线', [['off', '无'], ['on', '开']], knobs.rules, function (value) { return { rules: value } }),
      groupLabel('装饰'),
      segRow('编号', [['off', '无'], ['01', '01'], ['02', '02'], ['03', '03']], knobs.poster, function (value) { return { poster: value } }),
      segRow('字号', [['black', '黑体'], ['mono', '等宽'], ['serif', '衬线']], knobs.num, function (value) { return { num: value } }),
      segRow('印章', [['on', '开'], ['off', '关']], knobs.stamp, function (value) { return { stamp: value } }),
      segRow('母题', [['ring', '圆'], ['diagonal', '斜线'], ['none', '无']], knobs.motif, function (value) { return { motif: value } }),
      segRow('红块', [['light', '少'], ['normal', '中'], ['strong', '多']], knobs.weight, function (value) { return { weight: value } }),
      groupLabel('字体'),
      segRow('字距', [['tight', '紧'], ['normal', '标准'], ['wide', '宽']], knobs.tracking, function (value) { return { tracking: value } }))

    const lookTab = React.createElement('div', { className: 'lg-section' },
      languageRow,
      packsRow,
      knobs.language === 'constructivist' ? posterControls : glassControls)

    const petTab = React.createElement('div', { className: 'lg-section' },
      React.createElement('div', { className: 'lg-inline' },
        React.createElement('span', null, '显示桌宠'),
        React.createElement('button', {
          className: 'lg-toggle' + (knobs.petVisible ? ' is-on' : ''),
          'aria-pressed': knobs.petVisible ? 'true' : 'false',
          onClick: function () { patch({ petVisible: !knobs.petVisible }) },
        }, React.createElement('span', null))),
      React.createElement(ControlRow, { label: '大小', value: Math.round(knobs.petScale * 100) + '%' },
        React.createElement('input', {
          className: 'lg-range', type: 'range', min: '80', max: '140', step: '5',
          value: Math.round(knobs.petScale * 100),
          onChange: function (event) { patch({ petScale: Number(event.target.value) / 100 }) },
        })),
      React.createElement('div', { className: 'lg-segment' },
        [[0, '静默'], [1, '偶尔'], [2, '话痨']].map(function (pair) {
          return React.createElement('button', {
            key: pair[0],
            className: 'lg-seg' + (knobs.chatty === pair[0] ? ' is-active' : ''),
            onClick: function () { patch({ chatty: pair[0] }) },
          }, pair[1])
        })),
      React.createElement('div', { className: 'lg-expressions' },
        Object.keys(EXPRESSIONS).map(function (key) {
          return React.createElement('button', {
            key: key,
            className: 'lg-expression' + (expression === key ? ' is-active' : ''),
            title: EXPRESSIONS[key].label,
            onClick: function () { speak(key) },
          }, React.createElement('img', { src: '/liuguang/pet/' + key + '.png', alt: EXPRESSIONS[key].label, draggable: false }))
        })),
      React.createElement('button', {
        className: 'lg-reset',
        onClick: function () { setPet({ right: 32, bottom: 120 }) },
      }, '桌宠回到右下角'))

    const aboutTab = React.createElement('div', { className: 'lg-section lg-about' },
      React.createElement('p', null, 'Liuguang · 液态玻璃皮肤 v0.5'),
      React.createElement('p', null, '形象：上善无形 / ZipZipPipe（CC BY-NC-SA 4.0）'),
      React.createElement('p', { className: 'lg-dim' }, '皮肤只作用于表现层，不改动会话数据。'),
      React.createElement('p', { className: 'lg-dim' }, '皮肤包目录：~/.dsh/lg-packs/<id>/'),
      packProblems > 0 && React.createElement('p', { className: 'lg-dim' }, '有 ' + packProblems + ' 个皮肤包未能加载（检查 pack.json）'),
      React.createElement('button', {
        className: 'lg-reset',
        onClick: function () { setKnobs(configDefaults) },
      }, '恢复默认外观'))

    const panel = open && React.createElement('div', { className: 'lg-panel', role: 'dialog', 'aria-label': '个性化' },
      React.createElement('div', { className: 'lg-panel-title' },
        React.createElement('span', null, '个性化'),
        React.createElement('button', { className: 'lg-close', onClick: function () { setOpen(false) }, 'aria-label': '关闭' }, '×')),
      React.createElement('div', { className: 'lg-tabs' }, tabButton('look', '外观'), tabButton('pet', '桌宠'), tabButton('about', '关于')),
      tab === 'look' ? lookTab : tab === 'pet' ? petTab : aboutTab)

    const petVisible = knobs.petVisible && !open
    const shownLine = line || (expression === 'sleepy' ? 'zzz…' : '')

    return React.createElement('div', { className: 'lg-layer' },
      // Column guides for the constructivist language (CSS decides visibility).
      React.createElement('div', { className: 'lg-guides', 'aria-hidden': 'true' }),
      React.createElement('button', {
        className: 'lg-launcher' + (open ? ' is-open' : ''),
        'aria-label': '个性化',
        title: '个性化',
        onClick: function () { setOpen(function (value) { return !value }) },
      }, '✦'),
      panel,
      petVisible && React.createElement('div', {
        className: 'lg-pet' + (expression === 'sleepy' ? ' is-sleepy' : ''),
        style: { right: pet.right + 'px', bottom: pet.bottom + 'px' },
        onPointerDown: onPointerDown,
        onPointerMove: onPointerMove,
        onPointerUp: onPointerUp,
        onPointerCancel: onPointerUp,
        onClick: react,
        onMouseEnter: function () { if (expression !== 'sleepy') setExpression('done') },
        onMouseLeave: function () { if (expression === 'done') setExpression('wave') },
        role: 'button',
        tabIndex: 0,
        onKeyDown: function (event) { if (event.key === 'Enter' || event.key === ' ') react() },
        'aria-label': 'DeepSeek 娘',
      },
        shownLine !== '' && React.createElement('div', { className: 'lg-bubble' }, shownLine),
        React.createElement('div', { className: 'lg-pet-body' }, React.createElement(PetSprite, { expression: expression })),
      ))
  }
}

/** Register the overlay on the frame-wide slot. */
function mountOverlay(ctx, config) {
  const Overlay = createOverlay(config)
  ctx.slots.inject('shell.overlay', function () {
    return ctx.slots.register({ name: 'shell.overlay', id: 'liuguang', order: 90 }, Overlay)
  })
}

/**
 * Mount the overlay on the slot registry the plugin declared in `inject`.
 * @param ctx - client root context (carries `slots`).
 * @param config - plugin entry config.
 */
function mountControls(ctx, config) {
  const slots = ctx.slots
  if (slots === undefined || slots === null || typeof slots.inject !== 'function') return
  mountOverlay({ slots: slots }, config)
}
