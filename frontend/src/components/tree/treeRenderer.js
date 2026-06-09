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

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

export function drawEdges(ctx, nodes, edges, hovId, selId, R) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))

  // dim pass first
  edges.forEach(([f, t]) => {
    const fn = byId[f], tn = byId[t]
    if (!fn || !tn) return
    const isHl = (selId && (f === selId || t === selId)) ||
                 (hovId && (f === hovId || t === hovId))
    if (isHl) return
    const x1 = fn.cx, y1 = fn.cy + R, x2 = tn.cx, y2 = tn.cy - R
    const dy = (y2 - y1) * 0.44
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(x1, y1 + dy, x2, y2 - dy, x2, y2)
    ctx.strokeStyle = 'rgba(255,255,255,0.11)'
    ctx.lineWidth = 0.8
    ctx.stroke()
  })

  // highlight pass on top
  edges.forEach(([f, t]) => {
    const fn = byId[f], tn = byId[t]
    if (!fn || !tn) return
    const isHl = (selId && (f === selId || t === selId)) ||
                 (hovId && (f === hovId || t === hovId))
    if (!isHl) return
    const x1 = fn.cx, y1 = fn.cy + R, x2 = tn.cx, y2 = tn.cy - R
    const dy = (y2 - y1) * 0.44
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(x1, y1 + dy, x2, y2 - dy, x2, y2)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.3
    ctx.stroke()
  })
}

export function drawNode(ctx, n, isHov, isSel, pulse, R) {
  const col = CLR[n.state] || CLR.gray

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
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = isSel ? '#e4e4e7' : isHov ? '#a1a1aa' : '#3a3a42'
  ctx.font = `${isSel || isHov ? '500 ' : ''}9.5px "Fira Sans",-apple-system,sans-serif`
  const label = n.name || n.label || n.id
  ctx.fillText(label, n.cx, n.cy + R + 6)
}

function drawIcon(ctx, n, col, R) {
  ctx.save()
  ctx.translate(n.cx, n.cy)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const state = n.state

  if (state === 'mastered') {
    ctx.strokeStyle = rgba(col, 0.9)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-5, 0); ctx.lineTo(-1.5, 4); ctx.lineTo(5.5, -4.5)
    ctx.stroke()

  } else if (state === 'locked') {
    ctx.strokeStyle = rgba(col, 0.75)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (ctx.roundRect) { ctx.roundRect(-5, -0.5, 10, 7.5, 1.5) }
    else { ctx.rect(-5, -0.5, 10, 7.5) }
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -0.5, 3.2, Math.PI, 0)
    ctx.stroke()

  } else if (state === 'in_progress' && n.conf != null) {
    ctx.fillStyle = rgba(col, 0.9)
    ctx.font = 'bold 11px "Fira Code",monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.conf, 0, 0.5)

  } else if (state === 'ready') {
    ctx.strokeStyle = rgba(col, 0.5)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-4, 0); ctx.lineTo(4, 0)
    ctx.stroke()
  }

  ctx.restore()
}
