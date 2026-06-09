// Pure drawing functions — no React, no side effects.

export const CLR = {
  green:       '#22c55e',
  amber:       '#f59e0b',
  blue:        '#38bdf8',
  gray:        '#52525b',
  red:         '#ef4444',
  mastered:    '#22c55e',
  in_progress: '#f59e0b',
  active:      '#38bdf8',
  ready:       '#52525b',
  locked:      '#ef4444',
}

// Light-mode overrides for states that need more contrast on a pale bg
const CLR_LIGHT = {
  ...CLR,
  ready:  '#8e8e99',
  locked: '#c0c0cc',
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

export function drawEdges(ctx, nodes, edges, hovId, selId, R, dark = true) {
  const byId   = Object.fromEntries(nodes.map(n => [n.id, n]))
  const dimClr = dark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)'
  const hlClr  = dark ? 'rgba(255,255,255,0.50)' : 'rgba(0,0,0,0.45)'

  function drawCurve(fn, tn, style, width) {
    const x1 = fn.cx, y1 = fn.cy + R, x2 = tn.cx, y2 = tn.cy - R
    const dy = (y2 - y1) * 0.44
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(x1, y1 + dy, x2, y2 - dy, x2, y2)
    ctx.strokeStyle = style
    ctx.lineWidth = width
    ctx.stroke()
  }

  // dim pass first (non-highlighted edges)
  edges.forEach(([f, t]) => {
    const fn = byId[f], tn = byId[t]
    if (!fn || !tn) return
    const isHl = (selId && (f === selId || t === selId)) ||
                 (hovId && (f === hovId || t === hovId))
    if (!isHl) drawCurve(fn, tn, dimClr, 0.8)
  })

  // highlight pass on top
  edges.forEach(([f, t]) => {
    const fn = byId[f], tn = byId[t]
    if (!fn || !tn) return
    const isHl = (selId && (f === selId || t === selId)) ||
                 (hovId && (f === hovId || t === hovId))
    if (isHl) drawCurve(fn, tn, hlClr, 1.4)
  })
}

export function drawNode(ctx, n, isHov, isSel, pulse, R, dark = true) {
  const palette = dark ? CLR : CLR_LIGHT
  const col = palette[n.state] || palette.gray

  // active pulse ring
  if (n.state === 'active') {
    ctx.beginPath()
    ctx.arc(n.cx, n.cy, R + 7 + pulse * 4, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(col, pulse * 0.22)
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // selected halo
  if (isSel) {
    ctx.beginPath()
    ctx.arc(n.cx, n.cy, R + 7, 0, Math.PI * 2)
    ctx.strokeStyle = rgba(col, 0.2)
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // fill
  ctx.beginPath()
  ctx.arc(n.cx, n.cy, R, 0, Math.PI * 2)
  ctx.fillStyle = rgba(col, isSel ? 0.22 : isHov ? 0.18 : 0.13)
  ctx.fill()

  // ring
  ctx.beginPath()
  ctx.arc(n.cx, n.cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = rgba(col, isSel ? 1 : isHov ? 0.95 : 0.75)
  ctx.lineWidth = isSel ? 2.5 : isHov ? 2.2 : 2
  ctx.stroke()

  // active pulsing dot
  if (n.state === 'active') {
    ctx.beginPath()
    ctx.arc(n.cx, n.cy, 3 + pulse * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = rgba(col, 0.7 + pulse * 0.3)
    ctx.fill()
  }

  drawIcon(ctx, n, col, R)

  // label
  const labelClr = dark
    ? (isSel ? '#e4e4e7' : isHov ? '#a1a1aa' : '#3a3a42')
    : (isSel ? '#18181b' : isHov ? '#3f3f46' : '#a1a1aa')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = labelClr
  ctx.font = `${isSel || isHov ? '500 ' : ''}9.5px "Fira Sans",-apple-system,sans-serif`
  ctx.fillText(n.name || n.label || n.id, n.cx, n.cy + R + 6)
}

function drawIcon(ctx, n, col, R) {
  ctx.save()
  ctx.translate(n.cx, n.cy)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (n.state === 'mastered') {
    ctx.strokeStyle = rgba(col, 0.9)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-5, 0); ctx.lineTo(-1.5, 4); ctx.lineTo(5.5, -4.5)
    ctx.stroke()

  } else if (n.state === 'locked') {
    ctx.strokeStyle = rgba(col, 0.75)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (ctx.roundRect) { ctx.roundRect(-5, -0.5, 10, 7.5, 1.5) }
    else               { ctx.rect(-5, -0.5, 10, 7.5) }
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -0.5, 3.2, Math.PI, 0)
    ctx.stroke()

  } else if (n.state === 'in_progress' && n.conf != null) {
    ctx.fillStyle = rgba(col, 0.9)
    ctx.font = 'bold 11px "Fira Code",monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.conf, 0, 0.5)

  } else if (n.state === 'ready') {
    ctx.strokeStyle = rgba(col, 0.6)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0)
    ctx.stroke()
  }

  ctx.restore()
}
