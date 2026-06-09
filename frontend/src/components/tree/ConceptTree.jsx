import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { layoutTree } from '../../utils/treeLayout'
import { drawEdges, drawNode } from './treeRenderer'
import { api } from '../../api'
import { useTheme } from '../../context/ThemeContext'

const R = 18
const ZOOM_MAX = 3.0
const EASE = 0.13

function fitCamera(nodes, W, H) {
  if (!nodes.length) return { panX: W / 2, panY: H / 2, zoom: 1 }
  const pad = R + 32
  const minX = Math.min(...nodes.map(n => n.cx)) - pad
  const maxX = Math.max(...nodes.map(n => n.cx)) + pad
  const minY = Math.min(...nodes.map(n => n.cy)) - pad
  const maxY = Math.max(...nodes.map(n => n.cy)) + pad
  const zoom = Math.min(W / (maxX - minX), H / (maxY - minY), 1.3) * 0.88
  return {
    panX: (W - (maxX - minX) * zoom) / 2 - minX * zoom,
    panY: (H - (maxY - minY) * zoom) / 2 - minY * zoom,
    zoom,
  }
}

function ZoomBtn({ onClick, title, children }) {
  const ref = useRef(null)
  return (
    <button ref={ref} onClick={onClick} title={title}
      onMouseEnter={() => { ref.current.style.color = 'var(--text-primary)' }}
      onMouseLeave={() => { ref.current.style.color = 'var(--text-muted)' }}
      style={{
        width: '28px', height: '28px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 0,
        transition: 'color 120ms ease, background 200ms ease, border-color 200ms ease',
      }}>
      {children}
    </button>
  )
}

export const ConceptTree = forwardRef(function ConceptTree({ projectId, onNodeSelect, refreshKey }, ref) {
  const canvasRef  = useRef(null)
  const wrapRef    = useRef(null)
  const { dark }   = useTheme()
  const stateRef  = useRef({
    nodes: [], edges: [], stars: [],
    panX: 0, panY: 0, targetPanX: 0, targetPanY: 0,
    zoom: 1, targetZoom: 1,
    fitZoom: 1,
    hovId: null, selId: null,
    isDrag: false, dragMoved: false,
    startX: 0, startY: 0, startPanX: 0, startPanY: 0,
    pinchDist: 0,
    rafId: null,
    W: 680, H: 480,
    dark: true,
  })

  const applyFit = useCallback(() => {
    const s = stateRef.current
    const cam = fitCamera(s.nodes, s.W, s.H)
    s.targetPanX = cam.panX; s.targetPanY = cam.panY; s.targetZoom = cam.zoom
  }, [])

  const applyZoom = useCallback((factor, cx, cy) => {
    const s = stateRef.current
    cx ??= s.W / 2; cy ??= s.H / 2
    const zoomMin = s.fitZoom * 0.8
    const newZoom = Math.min(Math.max(s.targetZoom * factor, zoomMin), ZOOM_MAX)
    const ratio = newZoom / s.targetZoom
    s.targetPanX = cx - (cx - s.targetPanX) * ratio
    s.targetPanY = cy - (cy - s.targetPanY) * ratio
    s.targetZoom = newZoom
  }, [])

  useImperativeHandle(ref, () => ({
    updateNodeState(conceptId, newState) {
      const node = stateRef.current.nodes.find(n => n.id === conceptId)
      if (node) node.state = newState
    },
    setHoveredNode(conceptId) {
      stateRef.current.hovId = conceptId ?? null
    },
  }))

  // Keep stateRef in sync with theme so the draw loop picks it up immediately
  useEffect(() => { stateRef.current.dark = dark }, [dark])

  // ── Load project ───────────────────────────────────────────────────────────
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
      s.nodes = layoutTree(concepts)
      s.edges = edgeList
      s.hovId = null; s.selId = null
      s.stars = Array.from({ length: 220 }, () => ({
        x: (Math.random() - 0.15) * 1400 - 100,
        y: (Math.random() - 0.1)  * 2200 - 150,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.08 + 0.025,
      }))
      const cam = fitCamera(s.nodes, s.W, s.H)
      s.fitZoom = cam.zoom
      s.panX = cam.panX; s.panY = cam.panY; s.zoom = cam.zoom
      s.targetPanX = cam.panX; s.targetPanY = cam.panY; s.targetZoom = cam.zoom
    }).catch(console.error)
  }, [projectId, refreshKey])

  // ── Canvas + render loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return

    const DPR = Math.min(devicePixelRatio, 2)
    const ctx  = canvas.getContext('2d')
    let W = 680, H = 480

    function initCanvas(w, h) {
      W = w; H = h
      stateRef.current.W = w
      stateRef.current.H = h
      canvas.width  = w * DPR
      canvas.height = h * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    // Size from container, not a hardcoded constant
    initCanvas(wrap.offsetWidth || 680, wrap.offsetHeight || 480)

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const nw = Math.floor(width), nh = Math.floor(height)
      if (nw > 0 && nh > 0 && (nw !== W || nh !== H)) initCanvas(nw, nh)
    })
    ro.observe(wrap)

    function frame() {
      const s = stateRef.current
      s.panX += (s.targetPanX - s.panX) * EASE
      s.panY += (s.targetPanY - s.panY) * EASE
      s.zoom += (s.targetZoom - s.zoom) * EASE

      const dk = s.dark
      const bg  = dk ? '#030304' : '#f5f5f7'
      const bgR = dk ? '3,3,4'   : '245,245,247'

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // World space
      ctx.save()
      ctx.translate(s.panX, s.panY)
      ctx.scale(s.zoom, s.zoom)

      s.stars.forEach(st => {
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r / s.zoom, 0, Math.PI * 2)
        ctx.fillStyle = dk
          ? `rgba(255,255,255,${st.a})`
          : `rgba(0,0,0,${st.a * 0.35})`
        ctx.fill()
      })

      drawEdges(ctx, s.nodes, s.edges, s.hovId, s.selId, R, dk)
      const pulse = (Math.sin(performance.now() / 520) + 1) / 2
      s.nodes.forEach(n => drawNode(ctx, n, n.id === s.hovId, n.id === s.selId, pulse, R, dk))

      ctx.restore()

      // Screen-space overlays
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.75)
      vig.addColorStop(0, `rgba(${bgR},0)`)
      vig.addColorStop(1, `rgba(${bgR},${dk ? 0.28 : 0.22})`)
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      const tf = ctx.createLinearGradient(0, 0, 0, 36)
      tf.addColorStop(0, `rgba(${bgR},0.9)`)
      tf.addColorStop(1, `rgba(${bgR},0)`)
      ctx.fillStyle = tf
      ctx.fillRect(0, 0, W, 36)

      s.rafId = requestAnimationFrame(frame)
    }

    stateRef.current.rafId = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(stateRef.current.rafId); ro.disconnect() }
  }, [])

  // ── Pointer + wheel ────────────────────────────────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const onWheel = e => {
      e.preventDefault()
      const s = stateRef.current
      if (e.ctrlKey || e.metaKey) {
        const rect = wrap.getBoundingClientRect()
        applyZoom(e.deltaY > 0 ? 0.85 : 1.18,
                  e.clientX - rect.left, e.clientY - rect.top)
      } else {
        const sc = e.deltaMode === 1 ? 20 : 1
        s.targetPanX -= e.deltaX * sc
        s.targetPanY -= e.deltaY * sc
      }
    }

    const onTouchStart = e => {
      if (e.touches.length === 2)
        stateRef.current.pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY)
    }
    const onTouchMove = e => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const s = stateRef.current
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY)
      if (s.pinchDist > 0) {
        const rect = wrap.getBoundingClientRect()
        applyZoom(dist / s.pinchDist,
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top)
      }
      s.pinchDist = dist
    }

    const onPointerDown = e => {
      // Let button clicks pass through uninterrupted
      if (e.target.closest('button')) return
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
      const rect = wrap.getBoundingClientRect()
      const wx = (e.clientX - rect.left  - s.panX) / s.zoom
      const wy = (e.clientY - rect.top   - s.panY) / s.zoom
      let hit = null
      for (const n of s.nodes)
        if (Math.hypot(n.cx - wx, n.cy - wy) <= R + 6 / s.zoom) { hit = n; break }
      s.hovId = hit?.id ?? null
      wrap.style.cursor = hit ? 'pointer' : 'default'
    }
    const onPointerUp = e => {
      const s = stateRef.current
      if (!s.dragMoved) {
        const rect = wrap.getBoundingClientRect()
        const wx = (e.clientX - rect.left  - s.panX) / s.zoom
        const wy = (e.clientY - rect.top   - s.panY) / s.zoom
        let hit = null
        for (const n of s.nodes)
          if (Math.hypot(n.cx - wx, n.cy - wy) <= R + 5 / s.zoom) { hit = n; break }
        if (hit) { s.selId = hit.id; onNodeSelect?.(hit) }
        else      { s.selId = null;  onNodeSelect?.(null) }
      }
      s.isDrag = false
    }

    wrap.addEventListener('wheel',       onWheel,      { passive: false })
    wrap.addEventListener('touchstart',  onTouchStart, { passive: true  })
    wrap.addEventListener('touchmove',   onTouchMove,  { passive: false })
    wrap.addEventListener('pointerdown', onPointerDown)
    wrap.addEventListener('pointermove', onPointerMove)
    wrap.addEventListener('pointerup',   onPointerUp)
    return () => {
      wrap.removeEventListener('wheel',       onWheel)
      wrap.removeEventListener('touchstart',  onTouchStart)
      wrap.removeEventListener('touchmove',   onTouchMove)
      wrap.removeEventListener('pointerdown', onPointerDown)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerup',   onPointerUp)
    }
  }, [onNodeSelect, applyZoom])

  const is = { fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round' }

  return (
    <div ref={wrapRef} style={{
      position: 'relative',
      flex: 1,          /* fills the tree-content flex column */
      minHeight: 0,     /* allows shrinking inside a flex container */
      background: '#030304',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Canvas fills the wrapper via CSS; buffer is set in JS */}
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <div style={{
        position: 'absolute', bottom: 12, right: 10,
        display: 'flex', flexDirection: 'column', zIndex: 10,
        borderRadius: '7px', overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        <ZoomBtn onClick={() => applyZoom(1.25)} title="Zoom in">
          <svg width="12" height="12" viewBox="0 0 12 12" {...is}>
            <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={applyFit} title="Fit view">
          <svg width="12" height="12" viewBox="0 0 12 12" {...is} strokeLinejoin="round">
            <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8"/>
          </svg>
        </ZoomBtn>
        <ZoomBtn onClick={() => applyZoom(0.8)} title="Zoom out">
          <svg width="12" height="12" viewBox="0 0 12 12" {...is}>
            <line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </ZoomBtn>
      </div>
    </div>
  )
})
