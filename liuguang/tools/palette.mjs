// Palette generator + WCAG audit.
//
// Colors are authored in OKLCH (perceptually even lightness), converted to
// sRGB hex, then every text/UI pair is checked against WCAG 2.1 contrast.
// The three "Layer 7" style blocks in lib/liuguang.css are rewritten between the
// generated markers, so the stylesheet stays reproducible.
//
//   node tools/palette.mjs           # report + rewrite the CSS blocks
//   node tools/palette.mjs --check   # report only, exit 1 if a pair fails
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cssPath = join(root, 'lib', 'liuguang.css')
const START = '/* >>> generated: palettes */'
const END = '/* <<< generated: palettes */'

/* ---------- color math ---------- */

function oklchToSrgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [r, g, blue]
}

const toGamma = (channel) => {
  const v = channel
  if (v <= 0.0031308) return 12.92 * v
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055
}

const toLinear = (channel) => {
  if (channel <= 0.04045) return channel / 12.92
  return ((channel + 0.055) / 1.055) ** 2.4
}

function hexFromOklch(L, C, h) {
  const [r, g, b] = oklchToSrgb(L, C, h).map((channel) => {
    const value = Math.min(1, Math.max(0, toGamma(channel)))
    return Math.round(value * 255)
  })
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex) {
  const value = hex.replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  const [r, g, b] = rgb.map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Mix two hex colors in linear light (mirrors color-mix previews). */
function mix(hexA, hexB, ratio) {
  const parse = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
  const a = parse(hexA)
  const b = parse(hexB)
  const out = a.map((value, index) => toGamma(toLinear(value) * (1 - ratio) + toLinear(b[index]) * ratio))
  return `#${out.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`
}

/* ---------- palettes (authored in OKLCH) ---------- */

const STYLES = {
  graphite: {
    label: '墨银',
    dark: {
      bg: [0.16, 0.004, 80],
      layer1: [0.2, 0.005, 80],
      layer2: [0.235, 0.006, 80],
      layer3: [0.265, 0.006, 80],
      sidebar: [0.185, 0.004, 80],
      input: [0.215, 0.005, 80],
      text: [0.94, 0.006, 80],
      text2: [0.78, 0.008, 80],
      text3: [0.66, 0.01, 80],
      accent: [0.79, 0.075, 85],
      accent2: [0.88, 0.05, 85],
      fill: [0.54, 0.085, 85],
    },
    light: {
      bg: [0.968, 0.004, 80],
      layer1: [1.0, 0.0, 80],
      layer2: [0.985, 0.003, 80],
      layer3: [1.0, 0.0, 80],
      sidebar: [0.945, 0.006, 80],
      input: [1.0, 0.0, 80],
      text: [0.24, 0.012, 80],
      text2: [0.42, 0.012, 80],
      text3: [0.55, 0.01, 80],
      accent: [0.55, 0.09, 80],
      accent2: [0.68, 0.07, 80],
      fill: [0.48, 0.1, 80],
    },
  },
  ocean: {
    label: '深海',
    dark: {
      bg: [0.15, 0.022, 255],
      layer1: [0.2, 0.026, 255],
      layer2: [0.24, 0.028, 255],
      layer3: [0.27, 0.028, 255],
      sidebar: [0.175, 0.024, 255],
      input: [0.21, 0.026, 255],
      text: [0.94, 0.012, 250],
      text2: [0.78, 0.02, 250],
      text3: [0.66, 0.024, 250],
      accent: [0.74, 0.12, 235],
      accent2: [0.85, 0.08, 220],
      fill: [0.52, 0.13, 240],
    },
    light: {
      bg: [0.965, 0.012, 250],
      layer1: [1.0, 0.0, 250],
      layer2: [0.985, 0.008, 250],
      layer3: [1.0, 0.0, 250],
      sidebar: [0.94, 0.018, 250],
      input: [1.0, 0.0, 250],
      text: [0.25, 0.03, 255],
      text2: [0.43, 0.03, 255],
      text3: [0.56, 0.026, 255],
      accent: [0.55, 0.13, 245],
      accent2: [0.68, 0.1, 235],
      fill: [0.47, 0.14, 245],
    },
  },
  sand: {
    label: '暖砂',
    dark: {
      bg: [0.155, 0.012, 60],
      layer1: [0.2, 0.014, 60],
      layer2: [0.235, 0.016, 60],
      layer3: [0.265, 0.016, 60],
      sidebar: [0.18, 0.013, 60],
      input: [0.21, 0.014, 60],
      text: [0.94, 0.012, 70],
      text2: [0.78, 0.02, 70],
      text3: [0.66, 0.022, 70],
      accent: [0.76, 0.11, 65],
      accent2: [0.86, 0.08, 75],
      fill: [0.53, 0.12, 65],
    },
    light: {
      bg: [0.966, 0.012, 70],
      layer1: [1.0, 0.0, 70],
      layer2: [0.985, 0.008, 70],
      layer3: [1.0, 0.0, 70],
      sidebar: [0.94, 0.018, 70],
      input: [1.0, 0.0, 70],
      text: [0.25, 0.02, 65],
      text2: [0.43, 0.022, 65],
      text3: [0.56, 0.02, 65],
      accent: [0.55, 0.12, 62],
      accent2: [0.68, 0.1, 70],
      fill: [0.48, 0.13, 62],
    },
  },
}

/* ---------- audit ---------- */

const results = []
let failures = 0

function audit(styleId, mode, tokens) {
  const pairs = [
    ['正文 / 背景', tokens.text, tokens.bg, 4.5],
    ['正文 / 一级面', tokens.text, tokens.layer1, 4.5],
    ['正文 / 二级面', tokens.text, tokens.layer2, 4.5],
    ['正文 / 侧栏', tokens.text, tokens.sidebar, 4.5],
    ['正文 / 输入卡', tokens.text, tokens.input, 4.5],
    ['次要文字 / 一级面', tokens.text2, tokens.layer1, 4.5],
    ['三级文字 / 一级面', tokens.text3, tokens.layer1, 4.5],
    ['强调色 / 一级面', tokens.accent, tokens.layer1, 3.0],
    ['按钮白字 / 按钮底', '#ffffff', tokens.fill, 4.5],
    ['按钮底 / 一级面', tokens.fill, tokens.layer1, 3.0],
    ['强调色 / 背景', tokens.accent, tokens.bg, 3.0],
  ]
  for (const [name, fg, bg, minimum] of pairs) {
    const value = contrast(fg, bg)
    const ok = value >= minimum
    if (!ok) failures += 1
    results.push({ styleId, mode, name, fg, bg, value: Number(value.toFixed(2)), minimum, ok })
  }
}

/* ---------- css emission ---------- */

function tokenBlock(tokens) {
  return [
    `  --dsw-alias-bg-base: ${tokens.bg};`,
    `  --dsw-alias-bg-layer-1: ${tokens.layer1};`,
    `  --dsw-alias-bg-layer-2: ${tokens.layer2};`,
    `  --dsw-alias-bg-layer-3: ${tokens.layer3};`,
    `  --dsw-alias-bg-overlay: ${tokens.layer2};`,
    `  --dsw-alias-bg-module-platform: ${tokens.layer2};`,
    `  --dsw-alias-bg-multi-select: ${tokens.layer2};`,
    `  --dsw-specific-sidebar-fill: ${tokens.sidebar};`,
    `  --dsw-specific-input-major: ${tokens.input};`,
    `  --dsw-specific-selector: ${tokens.layer2};`,
    `  --dsw-specific-tip: ${tokens.layer2};`,
    `  --dsw-specific-bubble: ${tokens.layer2};`,
    `  --dsw-specific-bubble-highlight: ${tokens.layer3};`,
    `  --dsw-alias-label-primary: ${tokens.text};`,
    `  --dsw-alias-label-secondary: ${tokens.text2};`,
    `  --dsw-alias-label-tertiary: ${tokens.text3};`,
    `  --lg-accent: ${tokens.accent};`,
    `  --lg-accent-2: ${tokens.accent2};`,
    `  --lg-accent-fill: ${tokens.fill};`,
  ].join('\n')
}

function emitCss() {
  const chunks = [START]
  for (const [id, style] of Object.entries(STYLES)) {
    const resolved = {}
    for (const mode of ['dark', 'light']) {
      const entry = {}
      for (const [key, value] of Object.entries(style[mode])) entry[key] = hexFromOklch(...value)
      resolved[mode] = entry
    }
    chunks.push(`/* ${style.label} (${id}) */`)
    chunks.push(`html[data-lg-style='${id}'] body[data-ds-dark-theme] {\n${tokenBlock(resolved.dark)}\n}`)
    chunks.push(`html[data-lg-style='${id}'] body:not([data-ds-dark-theme]) {\n${tokenBlock(resolved.light)}\n}`)
  }
  chunks.push(END)
  return chunks.join('\n')
}

/* ---------- main ---------- */

for (const [id, style] of Object.entries(STYLES)) {
  for (const mode of ['dark', 'light']) {
    const resolved = {}
    for (const [key, value] of Object.entries(style[mode])) resolved[key] = hexFromOklch(...value)
    audit(id, mode, resolved)
  }
}

const worst = results.reduce((acc, row) => (row.value < acc.value ? row : acc), results[0])
if (process.argv.includes('--check')) {
  for (const row of results) {
    console.log(`${row.ok ? 'PASS' : 'FAIL'}  ${row.styleId}/${row.mode}  ${row.name}  ${row.fg} on ${row.bg} = ${row.value} (min ${row.minimum})`)
  }
  console.log(`\nworst: ${worst.styleId}/${worst.mode} ${worst.name} = ${worst.value}`)
  console.log(`failures: ${failures}`)
  process.exit(failures === 0 ? 0 : 1)
}

const css = readFileSync(cssPath, 'utf8')
if (!css.includes(START) || !css.includes(END)) {
  console.error(`palette markers not found in ${cssPath}`)
  process.exit(1)
}
// The markers contain regex metacharacters (`/`, `*`), so escape them before
// building the region pattern — an unescaped pattern silently replaces nothing.
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const region = new RegExp(`${escapeRe(START)}[\\s\\S]*?${escapeRe(END)}`)
const generated = emitCss()
const next = css.replace(region, generated)
if (!next.includes("data-lg-style") || next.length === css.length) {
  console.error('palette emission did not take effect; refusing to write a broken sheet')
  process.exit(1)
}
writeFileSync(cssPath, next, 'utf8')

const byStyle = {}
for (const row of results) {
  const key = `${row.styleId}/${row.mode}`
  byStyle[key] = Math.min(byStyle[key] ?? 99, row.value)
}
console.log('contrast floors:', byStyle)
console.log(`failures: ${failures}`)
console.log(`rewrote palette blocks in ${cssPath}`)
if (failures > 0) process.exit(1)
