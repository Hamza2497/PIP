import { useRef, useEffect, useCallback } from 'react'
import { layoutTree } from '../../utils/treeLayout'
import { drawEdges, drawNode } from './treeRenderer'
import { api } from '../../api'

const R = 18
const VIEWPORT_H = 480
const ZOOM_MIN = 0.15
const ZOOM_MAX = 3.0
const EASE = 0.13

// Compute pan+zoom so all nodes fit the viewport
function fitCamera(nodes, W) {
  if (!nodes.length) return { panX: W / 2, panY: VIEWPORT_H / 2, zoom: 1 }
  const pad = R + 32
  const minX = Math.min(...nodes.map(n => n.cx)) - pad
  const maxX = Math.max(...nodes.map(n => n.cx)) + pad
  const minY = Math.min(...nodes.map(n => n.cy)) - pad
  const maxY = Math.max(...nodes.map(n => n.cy)) + pad
  const zoom = Math.min(W / (maxX - minX), VIEWPORT_H / (maxY - minY), 1.3) * 0.88
  return {
    panX: (W - (maxX - minX) * zoom) / 2 - minX * zoom,
    panY: (VIEWPORT_H - (maxY - minY) * zoom) / 2 - minY * zoom,
    zoom,
  }
}

// +/-/fit button bar
function ZoomBtn({ onClick, title, children }) {
  const ref = useRef(null)
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={title}
      onMouseEnter={() => { ref.current.style.color = '#f4f4f5' }}
      onMouseLeave={() => { ref.current.style.color = '#52525b' }}
      style={{
        width: '28px', height: '28px',
        background: 'rgba(13,13,15,0.88)',
        border: '1px solid rgba(31,31,35,0.9)',
        color: '#52525b',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 0,
        transition: 'color 120ms ease',
        backdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </button>
  )
}

export function ConceptTree({ projectId, onNodeSelect }) {
  const canvasRef = useRef(null)
  const wrapRef   = useRef(null)
  const stateRef  = useRef({
    nodes: [], edges: [], stars: [],
    panX: 0, panY: 0,
    targetPanX: 0, targetPanY: 0,
    zoom: 1, targetZoom: 1,
    hovId: null, selId: null,
    isDrag: false, dragMoved: false,
    startX: 0, startY: 0, startPanX: 0, startPanY: 0,
    pinchDist: 0,
    rafId: null, W: 680,
  })

  const applyFit = useCallback(() => {
    const s = stateRef.current
    const cam = fitCamera(s.nodes, s.W)
    s.targetPanX = cam.panX
    s.targetPanY = cam.panY
    s.targetZoom = cam.zoom
  }, [])

  const applyZoom = useCallback((factor, cx, cy) => {
    const s = stateRef.current
    cx ??= s.W / 2; cy ??= VIEWPORT_H / 2
    const newZoom = Math.min(Math.max(s.targetZoom * factor, ZOOM_MIN), ZOOM_MAX)
    const ratio = newZoom / s.targetZoom
    s.targetPanX = cx - (cx - s.targetPanX) * ratio
    s.targetPanY = cy - (cy - s.targetPanY) * ratio
    s.targetZoom = newZoom
  }, [])

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    api.getProject(projectId).then(data => {
      const s = stateRef.current
      const concepts = data.concepts.map(c => ({
        ...c, name: c.label, conf: c.confidence ?? null,
      }))
      const edgeList = []
      concepts.forEach(c => {
        ;(c.prereqs || []).forEach(pid => edgeList.push([pid, c.id]))
      })
      const laid = layoutTree(concepts)
      s.nodes = laid
      s.edges = edgeList
      s.hovId = null; s.selId = null
      // Star field spread across a large world area
      s.stars = Array.from({ length: 220 }, () => ({
        x: (Math.random() - 0.15) * 1400 - 100,
        y: (Math.random() - 0.1) * 2200 - 150,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.08 + 0.025,
      }))
      // Instant-set then animate to fit
      const cam = fitCamera(laid, s.W)
      s.panX = cam.panX; s.panY = cam.panY; s.zoom = cam.zoom
      s.targetPanX = cam.panX; s.targetPanY = cam.panY; s.targetZoom = cam.zoom
    }).catch(console.error)
  }, [projectId])

  // ── Canvas setup + render loop ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    let W = wrap.offsetWidth || 680
    stateRef.current.W = W
    const DPR = Math.min(devicePixelRatio, 2)
    const ctx = canvas.getContext('2d')

    function initCanvas(w) {
      W = w; stateRef.current.W = w
      canvas.width  = w * DPR
      canvas.height = VIEWPORT_H * DPR
      canvas.style.width  = w + 'px'
      canvas.style.height = VIEWPORT_H + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    initCanvas(W)

    const ro = new ResizeObserver(([e]) => {
      const nw = Math.floor(e.contentRect.width)
      if (nw > 0 && nw !== W) initCanvas(nw)
    })
    ro.observe(wrap)

    function frame() {
      const s = stateRef.current
      s.panX  += (s.targetPanX  - s.panX)  * EASE
      s.panY  += (s.targetPanY  - s.panY)  * EASE
      s.zoom  += (s.targetZoom  - s.zoom)  * EASE

      ctx.clearRect(0, 0, W, VIEWPORT_H)
      ctx.fillStyle = '#030304'
      ctx.fillRect(0, 0, W, VIEWPORT_H)

      // ── World-space ──────────────────────────────────────
      ctx.save()
      ctx.translate(s.panX, s.panY)
      ctx.scale(s.zoom, s.zoom)

      // Stars (stay in world space so they parallax gently)
      s.stars.forEach(st => {
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r / s.zoom, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${st.a})`
        ctx.fill()
      })

      // Level separator lines
      ;[...new Set(s.nodes.map(n => n.cy))].forEach(ly => {
        ctx.beginPath()
        ctx.moveTo(-1500, ly - R - 20)
        ctx.lineTo(1500,  ly - R - 20)
        ctx.strokeStyle = 'rgba(255,255,255,0.025)'
        ctx.lineWidth = 0.5 / s.zoom
        ctx.stroke()
      })

      drawEdges(ctx, s.nodes, s.edges, s.hovId, s.selId, R)

      const pulse = (Math.sin(performance.now() / 520) + 1) / 2
      s.nodes.forEach(n => drawNode(ctx, n, n.id === s.hovId, n.id === s.selId, pulse, R))

      ctx.restore()
      // ── Screen-space overlays ─────────────────────────────

      // Vignette
      const vig = ctx.createRadialGradient(
        W/2, VIEWPORT_H/2, VIEWPORT_H*0.2,
        W/2, VIEWPORT_H/2, VIEWPORT_H*0.75,
      )
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,0,0.28)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, VIEWPORT_H)

      // Top edge fade
      const tf = ctx.createLinearGradient(0, 0, 0, 36)
      tf.addColorStop(0, 'rgba(3,3,4,0.9)')
      tf.addColorStop(1, 'rgba(3,3,4,0)')
      ctx.fillStyle = tf
      ctx.fillRect(0, 0, W, 36)

      s.rafId = requestAnimationFrame(frame)
    }

    stateRef.current.rafId = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(stateRef.current.rafId); ro.disconnect() }
  }, [])

  // ── Pointer + wheel events ─────────────────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    // Scroll → pan; Ctrl/Meta+scroll → zoom towards cursor
    const onWheel = e => {
      e.preventDefault()
      const s = stateRef.current
      if (e.ctrlKey || e.metaKey) {
        const rect = wrap.getBoundingClientRect()
        applyZoom(e.deltaY > 0 ? 0.85 : 1.18,
                  e.clientX - rect.left, e.clientY - rect.top)
      } else {
        const scale = e.deltaMode === 1 ? 20 : 1
        s.targetPanX -= e.deltaX * scale
        s.targetPanY -= e.deltaY * scale
      }
    }

    // Pinch → zoom towards pinch centre
    const onTouchStart = e => {
      if (e.touches.length === 2) {
        stateRef.current.pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
      }
    }
    const onTouchMove = e => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const s = stateRef.current
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (s.pinchDist > 0) {
        const rect = wrap.getBoundingClientRect()
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top
        applyZoom(dist / s.pinchDist, cx, cy)
      }
      s.pinchDist = dist
    }

    // Drag → pan
    const onPointerDown = e => {
      const s = stateRef.current
      s.isDrag = true; s.dragMoved = false
      s.startX = e.clientX; s.startY = e.clientY
      s.startPanX = s.targetPanX; s.startPanY = s.targetPanY
      wrap.setPointerCapture?.(e.pointerId)
    }
    const onPointerMove = e => {
      const s = stateRef.current
      if (s.isDrag) {
        const dx = e.clientX - s.startX, dy = e.clientY - s.startY
        if (Math.hypot(dx, dy) > 4) s.dragMoved = true
        s.targetPanX = s.startPanX + dx
        s.targetPanY = s.startPanY + dy
        return
      }
      // Hover — convert screen → world
      const rect = wrap.getBoundingClientRect()
      const wx = (e.clientX - rect.left - s.panX) / s.zoom
      const wy = (e.clientY - rect.top  - s.panY) / s.zoom
      let hit = null
      for (const n of s.nodes) {
        if (Math.hypot(n.cx - wx, n.cy - wy) <= R + 6 / s.zoom) { hit = n; break }
      }
      s.hovId = hit?.id ?? null
      wrap.style.cursor = hit ? 'pointer' : 'default'
    }
    const onPointerUp = e => {
      const s = stateRef.current
      if (!s.dragMoved) {
        const rect = wrap.getBoundingClientRect()
        const wx = (e.clientX - rect.left - s.panX) / s.zoom
        const wy = (e.clientY - rect.top  - s.panY) / s.zoom
        let hit = null
        for (const n of s.nodes) {
          if (Math.hypot(n.cx - wx, n.cy - wy) <= R + 5 / s.zoom) { hit = n; break }
        }
        if (hit) { s.selId = hit.id; onNodeSelect?.(hit) }
        else      { s.selId = null;  onNodeSelect?.(null) }
      }
      s.isDrag = false
    }

    wrap.addEventListener('wheel',        onWheel,       { passive: false })
    wrap.addEventListener('touchstart',   onTouchStart,  { passive: true  })
    wrap.addEventListener('touchmove',    onTouchMove,   { passive: false })
    wrap.addEventListener('pointerdown',  onPointerDown)
    wrap.addEventListener('pointermove',  onPointerMove)
    wrap.addEventListener('pointerup',    onPointerUp)
    return () => {
      wrap.removeEventListener('wheel',       onWheel)
      wrap.removeEventListener('touchstart',  onTouchStart)
      wrap.removeEventListener('touchmove',   onTouchMove)
      wrap.removeEventListener('pointerdown', onPointerDown)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerup',   onPointerUp)
    }
  }, [onNodeSelect, applyZoom])

  // ── Render ─────────────────────────────────────────────────────────────────
  const iconStroke = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' }

  return (
    <div ref={wrapRef} style={{
      position: 'relative', width: '100%', height: VIEWPORT_H,
      background: '#030304', overflow: 'hidden', userSelect: 'none', flexShrink: 0,
    }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Zoom controls */}
      <div style={{
        position: 'absolute', bottom: 12, right: 10,
        display: 'flex', flexDirection: 'column',
        zIndex: 10, borderRadius: '7px', overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
      }}>
        <ZoomBtn onClick={() => applyZoom(1.25)} title="Zoom in">
          <svg width="12" height="12" viewBox="0 0 12 12" {...iconStroke}>
            <line x1="6" y1="1" x2="6" y2="11" /><line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={applyFit} title="Fit view">
          <svg width="12" height="12" viewBox="0 0 12 12" {...iconStroke} strokeLinejoin="round">
            <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" />
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={() => applyZoom(0.8)} title="Zoom out">
          <svg width="12" height="12" viewBox="0 0 12 12" {...iconStroke}>
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </ZoomBtn>
      </div>
    </div>
  )
}
