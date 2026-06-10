import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import { api } from "../api"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"

// ─── Canvas tree preview ─────────────────────────────────────────────────────

const NODES = [
  { id:"n0", x:0.50, y:0.09,  state:"mastered"    },
  { id:"n1", x:0.26, y:0.33,  state:"mastered"    },
  { id:"n2", x:0.74, y:0.33,  state:"mastered"    },
  { id:"n3", x:0.12, y:0.58,  state:"in_progress" },
  { id:"n4", x:0.38, y:0.58,  state:"active"      },
  { id:"n5", x:0.62, y:0.58,  state:"ready"       },
  { id:"n6", x:0.88, y:0.58,  state:"ready"       },
  { id:"n7", x:0.22, y:0.84,  state:"locked"      },
  { id:"n8", x:0.50, y:0.84,  state:"locked"      },
  { id:"n9", x:0.78, y:0.84,  state:"locked"      },
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
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

function drawTree(ctx, w, h, dark) {
  ctx.clearRect(0, 0, w, h)
  const pos = Object.fromEntries(NODES.map(n => [n.id, { x:n.x*w, y:n.y*h }]))
  const R = Math.min(w, h) * 0.046
  const edgeClr = dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.13)"

  EDGES.forEach(([a,b]) => {
    const p=pos[a], q=pos[b], mid=(p.y+q.y)/2
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.bezierCurveTo(p.x, mid, q.x, mid, q.x, q.y)
    ctx.strokeStyle = edgeClr
    ctx.lineWidth = 1
    ctx.stroke()
  })

  NODES.forEach(n => {
    const { x, y } = pos[n.id]
    const col = C[n.state]

    // fill
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI*2)
    ctx.fillStyle = rgba(col, n.state === "locked" ? 0.08 : 0.13)
    ctx.fill()

    // stroke
    ctx.beginPath()
    ctx.arc(x, y, R, 0, Math.PI*2)
    ctx.strokeStyle = rgba(col, n.state === "locked" ? 0.4 : 0.75)
    ctx.lineWidth = 2
    ctx.stroke()

    // icon
    if (n.state === "mastered") {
      ctx.beginPath()
      ctx.moveTo(x-R*0.42, y)
      ctx.lineTo(x-R*0.1,  y+R*0.38)
      ctx.lineTo(x+R*0.45, y-R*0.38)
      ctx.strokeStyle = col
      ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.stroke()
    } else if (n.state === "active") {
      ctx.beginPath()
      ctx.arc(x, y, R*0.26, 0, Math.PI*2)
      ctx.fillStyle = "#38bdf8"; ctx.fill()
    } else if (n.state === "in_progress") {
      ctx.font = `600 ${Math.round(R*0.72)}px "Fira Code",monospace`
      ctx.fillStyle = "#f59e0b"
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("3", x, y+0.5)
    }
  })
}

function StaticTree() {
  const ref = useRef(null)
  const { dark } = useTheme()
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    const draw = () => {
      const w=canvas.clientWidth, h=canvas.clientHeight
      canvas.width=w*devicePixelRatio; canvas.height=h*devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      drawTree(ctx, w, h, dark)
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [dark])
  return <canvas ref={ref} style={{ width:"100%", height:"100%", display:"block" }} />
}

// ─── Theme icons ─────────────────────────────────────────────────────────────

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" fill="#f59e0b"/>
      <g stroke="#f59e0b" strokeWidth="2">
        <line x1="12" y1="2"  x2="12" y2="5"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="2"  y1="12" x2="5"  y2="12"/>
        <line x1="19" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </g>
    </svg>
  )
}
function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#818cf8" stroke="none"/>
    </svg>
  )
}

// ─── How it works steps ───────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Describe your project",
    body: "Tell PIP what you're building. It identifies the concepts the project will teach you, maps out their dependencies, and gives you a structured order to work through them.",
    color: "var(--accent-blue)",
  },
  {
    n: "02",
    title: "Build, then check in",
    body: "Work on each part. When you're done, tell PIP what you built. It fills in any gaps and asks one question to make sure the concept landed.",
    color: "var(--accent-amber)",
  },
  {
    n: "03",
    title: "Your knowledge compounds",
    body: "Every concept you complete updates your personal tree. PIP tracks your confidence across projects — so it knows what to reinforce and what to skip.",
    color: "var(--accent-green)",
  },
]

// ─── State legend ─────────────────────────────────────────────────────────────

const LEGEND = [
  ["#22c55e", "Mastered"],
  ["#38bdf8", "Active"],
  ["#f59e0b", "Progress"],
  ["#52525b", "Ready"],
  ["#ef4444", "Locked"],
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const { dark, toggle: toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleSuccess = useCallback(async ({ credential }) => {
    setSigningIn(true)
    try {
      const user = await api.googleAuth(credential)
      login(user)
      navigate("/app")
    } catch (e) {
      console.error("Login failed:", e)
      setSigningIn(false)
    }
  }, [login, navigate])

  const s = {
    // shared text style shortcuts
    muted: { fontSize:"12px", color:"var(--text-muted)", letterSpacing:"0.04em" },
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Ambient glow ───────────────────────────────────────────────────── */}
      <div style={{
        position:"fixed", top:"-25vh", left:"50%", transform:"translateX(-50%)",
        width:"70vw", height:"55vh",
        background:"radial-gradient(ellipse, rgba(56,189,248,0.04) 0%, transparent 70%)",
        pointerEvents:"none", zIndex:0,
      }}/>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <div style={{ height: scrolled ? "57px" : "94px", transition:"height 200ms ease" }}/>
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:10,
        padding: scrolled ? "8px 32px" : "20px 32px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom: "1px solid var(--border-subtle)",
        background:"var(--bg-base)",
        transition:"padding 200ms ease",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <span style={{
            display:"inline-flex",
            fontFamily:'"Fira Code", monospace',
            fontSize: scrolled ? "20px" : "34px", fontWeight:"700",
            letterSpacing:"0.08em", color:"var(--text-primary)",
            transition:"font-size 200ms ease",
          }}>
            {["P","I","P"].map((ch, i) => (
              <span key={i} style={{
                display:"inline-flex", flexDirection:"column", alignItems:"center",
              }}>
                {ch}
                <span style={{
                  width:"70%", height:"2px", marginTop:"-6px", borderRadius:"1px",
                  background: ["#38bdf8","#f59e0b","#22c55e"][i],
                }}/>
              </span>
            ))}
          </span>
          {!scrolled && <span style={s.muted}>Personalised Interactive Pedagogy</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
          <button onClick={toggleTheme} title={dark?"Light mode":"Dark mode"} style={{
            background:"none", border:"1px solid var(--border)", borderRadius:"8px",
            color:"var(--text-muted)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            width:"32px", height:"32px",
            transition:"color 150ms ease, border-color 150ms ease",
          }}>
            {dark ? <IconSun/> : <IconMoon/>}
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <main style={{
        position:"relative", zIndex:1,
        flex:1,
        display:"flex", flexDirection:"column", alignItems:"center",
        padding:"72px 24px 56px",
        textAlign:"center",
      }}>
        {/* Badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:"7px",
          background:"rgba(56,189,248,0.05)",
          border:"1px solid rgba(56,189,248,0.15)",
          borderRadius:"99px",
          padding:"5px 14px",
          marginBottom:"36px",
          fontSize:"11px",
          color:"var(--accent-blue)",
          letterSpacing:"0.07em",
          fontFamily:'"Fira Code", monospace',
          fontWeight:"500",
        }}>
          <span style={{
            width:"6px", height:"6px", borderRadius:"50%",
            background:"var(--accent-blue)", display:"inline-block",
            animation:"pulseDot 1.6s ease-in-out infinite",
          }}/>
          AI-powered learning
        </div>

        {/* Headline */}
        <h1 style={{
          margin:"0 0 22px",
          fontSize:"clamp(44px, 6.5vw, 82px)",
          fontWeight:"800",
          lineHeight:"1.0",
          letterSpacing:"-0.04em",
          color:"var(--text-primary)",
          maxWidth:"740px",
          fontFamily:'"Fira Sans", sans-serif',
        }}>
          Learn while building.
          <br/>
          <span key={dark ? "dark" : "light"} style={{
            background:`linear-gradient(130deg, ${dark ? "#f4f4f5" : "#18181b"} 20%, #38bdf8 100%)`,
            WebkitBackgroundClip:"text",
            backgroundClip:"text",
            WebkitTextFillColor:"transparent",
            color:"transparent",
          }}>
            At your pace.
          </span>
        </h1>

        {/* Subline */}
        <p style={{
          margin:"0 0 44px",
          fontSize:"clamp(14px, 2vw, 16px)",
          color:"var(--text-muted)",
          lineHeight:"1.7",
          maxWidth:"460px",
        }}>
          PIP designs a personalised concept tree for any stack,
          then teaches you through it — one concept at a time.
        </p>

        {/* CTA */}
        <div style={{ marginBottom:"72px", minHeight:"44px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {signingIn ? (
            <div style={{
              display:"flex", alignItems:"center", gap:"10px",
              padding:"11px 24px",
              borderRadius:"99px",
              border:"1px solid var(--border)",
              fontFamily:'"Fira Code", monospace',
              fontSize:"13px",
              color:"var(--text-muted)",
              letterSpacing:"0.04em",
            }}>
              <span className="pulse-dot" style={{
                width:"8px", height:"8px", borderRadius:"50%",
                background:"var(--accent-blue)", display:"inline-block",
              }}/>
              Signing in…
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={() => console.error("Google login error")}
              theme="filled_black"
              size="large"
              text="continue_with"
              shape="pill"
              locale="en"
            />
          )}
        </div>

        {/* Tree preview card */}
        <div style={{
          width:"100%", maxWidth:"700px",
          height:"clamp(220px, 28vw, 320px)",
          position:"relative",
          borderRadius:"14px",
          overflow:"hidden",
          border:"1px solid var(--border)",
          background:"var(--bg-panel)",
          boxShadow:"0 0 0 1px rgba(56,189,248,0.04), 0 40px 100px rgba(0,0,0,0.6)",
          marginBottom:"24px",
        }}>
          {/* Top glow */}
          <div style={{
            position:"absolute", inset:0,
            background:"radial-gradient(ellipse at 50% -10%, rgba(56,189,248,0.05) 0%, transparent 55%)",
            pointerEvents:"none", zIndex:1,
          }}/>

          {/* Header strip */}
          <div style={{
            position:"absolute", top:0, left:0, right:0,
            padding:"10px 14px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            zIndex:2,
            borderBottom:"1px solid var(--border-subtle)",
            background:"var(--bg-panel)",
            backdropFilter:"blur(8px)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              {["#ef4444","#f59e0b","#22c55e"].map(c=>(
                <div key={c} style={{ width:"8px", height:"8px", borderRadius:"50%", background:c, opacity:0.6 }}/>
              ))}
            </div>
            <span style={{
              fontFamily:'"Fira Code", monospace',
              fontSize:"10px", color:"var(--text-muted)", letterSpacing:"0.08em",
            }}>
              CONCEPT TREE
            </span>
            <div style={{ display:"flex", gap:"8px" }}>
              {LEGEND.map(([col, lbl])=>(
                <div key={lbl} style={{ display:"flex", alignItems:"center", gap:"3px" }}>
                  <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:col, opacity:0.85 }}/>
                  <span style={{ fontSize:"9px", color:"var(--text-muted)" }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          <StaticTree/>
        </div>

        {/* Caption */}
        <p style={{
          ...s.muted,
          marginBottom:"80px",
          fontFamily:'"Fira Code", monospace',
        }}>
          Your concept map updates in real-time as you learn
        </p>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div style={{ width:"100%", maxWidth:"720px", marginBottom:"80px" }}>
          <div style={{
            fontFamily:'"Fira Code", monospace',
            fontSize:"14px", color:"var(--text-primary)",
            letterSpacing:"0.2em", fontWeight:"700",
            marginBottom:"36px",
          }}>
            HOW IT WORKS
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",
            gap:"1px",
            background:"var(--border-subtle)",
            borderRadius:"12px",
            overflow:"hidden",
            border:"1px solid var(--border)",
          }}>
            {STEPS.map((step, i) => (
              <div key={step.n} style={{
                background:"var(--bg-panel)",
                padding:"24px 22px",
                position:"relative",
                ...(i === 1 ? { borderLeft:"1px solid var(--border)", borderRight:"1px solid var(--border)" } : {}),
              }}>
                {/* Step number */}
                <div style={{
                  fontFamily:'"Fira Code", monospace',
                  fontSize:"11px",
                  color: step.color,
                  fontWeight:"600",
                  letterSpacing:"0.06em",
                  marginBottom:"10px",
                  opacity:0.7,
                }}>
                  {step.n}
                </div>

                {/* Accent line */}
                <div style={{
                  width:"20px", height:"2px",
                  background: step.color,
                  borderRadius:"2px",
                  marginBottom:"14px",
                  opacity:0.6,
                }}/>

                <div style={{
                  fontSize:"13px", fontWeight:"600",
                  color:"var(--text-primary)",
                  lineHeight:"1.4",
                  marginBottom:"8px",
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize:"12px", color:"var(--text-muted)",
                  lineHeight:"1.65",
                }}>
                  {step.body}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        position:"relative", zIndex:1,
        textAlign:"center",
        padding:"16px 24px 24px",
        fontSize:"11px",
        color:"var(--text-dim)",
        fontFamily:'"Fira Code", monospace',
        letterSpacing:"0.06em",
        borderTop:"1px solid var(--border-subtle)",
      }}>
        PIP · Personalised Interactive Pedagogy
      </footer>
    </div>
  )
}
