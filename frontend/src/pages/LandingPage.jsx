import { useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import { api } from "../api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

// ─── Static tree data ────────────────────────────────────────────────────────

const NODES = [
  { id: "n0", x: 0.50, y: 0.08,  state: "mastered"    },
  { id: "n1", x: 0.27, y: 0.32,  state: "mastered"    },
  { id: "n2", x: 0.73, y: 0.32,  state: "mastered"    },
  { id: "n3", x: 0.13, y: 0.56,  state: "in_progress" },
  { id: "n4", x: 0.38, y: 0.56,  state: "active"      },
  { id: "n5", x: 0.62, y: 0.56,  state: "ready"       },
  { id: "n6", x: 0.87, y: 0.56,  state: "ready"       },
  { id: "n7", x: 0.22, y: 0.82,  state: "locked"      },
  { id: "n8", x: 0.50, y: 0.82,  state: "locked"      },
  { id: "n9", x: 0.78, y: 0.82,  state: "locked"      },
]
const EDGES = [
  ["n0","n1"],["n0","n2"],
  ["n1","n3"],["n1","n4"],
  ["n2","n5"],["n2","n6"],
  ["n3","n7"],["n4","n8"],["n6","n9"],
]
const C = {
  mastered:    "#22c55e",
  in_progress: "#f59e0b",
  active:      "#38bdf8",
  ready:       "#52525b",
  locked:      "#ef4444",
}

function drawTree(ctx, w, h) {
  ctx.clearRect(0, 0, w, h)
  const pos = Object.fromEntries(NODES.map(n => [n.id, { x: n.x * w, y: n.y * h }]))
  const R = Math.min(w, h) * 0.048

  EDGES.forEach(([a, b]) => {
    const p = pos[a], q = pos[b]
    const mid = (p.y + q.y) / 2
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.bezierCurveTo(p.x, mid, q.x, mid, q.x, q.y)
    ctx.strokeStyle = "rgba(255,255,255,0.09)"
    ctx.lineWidth = 1
    ctx.stroke()
  })

  NODES.forEach(n => {
    const { x, y } = pos[n.id]
    const col = C[n.state]

    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.fillStyle = col
    ctx.globalAlpha = 0.12
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI * 2)
    ctx.strokeStyle = col
    ctx.lineWidth = 1.8
    ctx.globalAlpha = n.state === "active" ? 0.95 : 0.7
    ctx.stroke()
    ctx.globalAlpha = 1

    if (n.state === "mastered") {
      ctx.beginPath()
      ctx.moveTo(x - R * 0.42, y)
      ctx.lineTo(x - R * 0.1,  y + R * 0.38)
      ctx.lineTo(x + R * 0.45, y - R * 0.38)
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.6
      ctx.lineCap = "round"
      ctx.stroke()
    } else if (n.state === "active") {
      ctx.beginPath()
      ctx.arc(x, y, R * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = col
      ctx.fill()
    } else if (n.state === "in_progress") {
      ctx.font = `600 ${Math.round(R * 0.72)}px system-ui`
      ctx.fillStyle = col
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText("3", x, y + 0.5)
    } else if (n.state === "ready") {
      ctx.beginPath()
      ctx.moveTo(x - R * 0.4, y)
      ctx.lineTo(x + R * 0.4, y)
      ctx.strokeStyle = "rgba(255,255,255,0.55)"
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  })
}

function StaticTree() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width  = w * devicePixelRatio
      canvas.height = h * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      drawTree(ctx, w, h)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])
  return <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} />
}

// ─── Feature pills ────────────────────────────────────────────────────────────

const FEATURES = [
  { dot: "#22c55e", label: "Any subject, any level"        },
  { dot: "#38bdf8", label: "Personalised concept trees"    },
  { dot: "#f59e0b", label: "Checkpoint-based progression"  },
]

// ─── Landing page ─────────────────────────────────────────────────────────────

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"  x2="12" y2="5"  /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}
function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

export default function LandingPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const { dark, toggle: toggleTheme } = useTheme()

  const handleSuccess = useCallback(async ({ credential }) => {
    try {
      const user = await api.googleAuth(credential)
      login(user)
      navigate("/app")
    } catch (e) {
      console.error("Login failed:", e)
    }
  }, [login, navigate])

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed",
        top: "-20vh",
        left: "50%",
        transform: "translateX(-50%)",
        width: "80vw",
        height: "60vh",
        background: "radial-gradient(ellipse, rgba(56,189,248,0.055) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Nav */}
      <nav style={{
        position: "relative",
        zIndex: 1,
        padding: "20px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: "14px",
          fontWeight: "700",
          letterSpacing: "0.12em",
          color: "var(--text-primary)",
        }}>
          PIP
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
            Personalised Interactive Pedagogy
          </span>
          <button
            onClick={toggleTheme}
            title={dark ? "Light mode" : "Dark mode"}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "8px",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px",
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {dark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main style={{
        position: "relative",
        zIndex: 1,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "64px 24px 48px",
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(56,189,248,0.08)",
          border: "1px solid rgba(56,189,248,0.18)",
          borderRadius: "99px",
          padding: "5px 14px",
          marginBottom: "32px",
          fontSize: "11px",
          color: "var(--accent-blue)",
          letterSpacing: "0.06em",
          fontWeight: "500",
        }}>
          <span style={{
            width: "6px", height: "6px",
            borderRadius: "50%",
            background: "var(--accent-blue)",
            display: "inline-block",
            animation: "pulseDot 1.6s ease-in-out infinite",
          }} />
          AI-powered learning
        </div>

        {/* Headline */}
        <h1 style={{
          margin: "0 0 20px",
          fontSize: "clamp(42px, 6.5vw, 80px)",
          fontWeight: "800",
          lineHeight: "1.0",
          letterSpacing: "-0.035em",
          color: "var(--text-primary)",
          maxWidth: "720px",
        }}>
          Learn anything.
          <br />
          <span style={{
            background: "linear-gradient(135deg, #f4f4f5 30%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            At your pace.
          </span>
        </h1>

        {/* Subline */}
        <p style={{
          margin: "0 0 40px",
          fontSize: "clamp(15px, 2vw, 17px)",
          color: "var(--text-muted)",
          lineHeight: "1.65",
          maxWidth: "480px",
        }}>
          PIP builds a personalised concept tree for any subject,
          then teaches you through it — one checkpoint at a time.
        </p>

        {/* CTA */}
        <div style={{ marginBottom: "64px" }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => console.error("Google login error")}
            theme="filled_black"
            size="large"
            text="continue_with"
            shape="pill"
          />
        </div>

        {/* Tree preview card */}
        <div style={{
          width: "100%",
          maxWidth: "680px",
          height: "clamp(220px, 30vw, 320px)",
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          background: "var(--bg-panel)",
          boxShadow: "0 0 0 1px rgba(56,189,248,0.06), 0 32px 80px rgba(0,0,0,0.5)",
          marginBottom: "48px",
        }}>
          {/* Inner glow */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 1,
          }} />

          {/* Label strip */}
          <div style={{
            position: "absolute",
            top: "12px",
            left: "14px",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            fontWeight: "500",
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
              <line x1="5" y1="2.5" x2="5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="6.8" x2="5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            CONCEPT MAP · PYTHON FUNDAMENTALS
          </div>

          {/* State legend */}
          <div style={{
            position: "absolute",
            bottom: "12px",
            right: "14px",
            zIndex: 2,
            display: "flex",
            gap: "10px",
          }}>
            {[["#22c55e","Mastered"],["#38bdf8","Active"],["#f59e0b","Progress"],["#52525b","Ready"],["#ef4444","Locked"]].map(([col, lbl]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: col, opacity: 0.85 }} />
                <span style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{lbl}</span>
              </div>
            ))}
          </div>

          <StaticTree />
        </div>

        {/* Feature pills */}
        <div style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "99px",
              padding: "7px 16px",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: f.dot, flexShrink: 0 }} />
              {f.label}
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        padding: "16px 24px 24px",
        fontSize: "11px",
        color: "var(--text-muted)",
        borderTop: "1px solid rgba(39,39,42,0.5)",
      }}>
        Built with AI · Personalised Interactive Pedagogy
      </footer>
    </div>
  )
}
