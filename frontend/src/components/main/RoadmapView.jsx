import { useEffect, useState } from "react"
import { api } from "../../api"
import { useProject } from "../../context/ProjectContext"

const STATE_COLORS = {
  mastered:    "var(--accent-green)",
  in_progress: "var(--accent-amber)",
  active:      "var(--accent-blue)",
  ready:       "var(--accent-gray)",
  locked:      "var(--accent-red)",
}

const STATE_LABELS = {
  mastered:    "Mastered",
  in_progress: "In progress",
  active:      "Active",
  ready:       "Ready",
  locked:      "Locked",
}

function MiniRing({ state }) {
  const color = STATE_COLORS[state] || "var(--accent-gray)"
  return (
    <svg width="10" height="10" style={{ flexShrink:0 }}>
      <circle cx="5" cy="5" r="3.5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.4"/>
    </svg>
  )
}

export default function RoadmapView() {
  const { activeProjectId, setActiveView, setActiveConcept } = useProject()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeProjectId) return
    setLoading(true)
    api.getProject(activeProjectId)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeProjectId])

  if (loading) {
    return (
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        color:"var(--text-muted)", fontSize:"12px", gap:"8px",
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" style={{ animation:"spin 0.9s linear infinite" }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <circle cx="8" cy="8" r="6" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeDasharray="20 18"/>
        </svg>
        Loading…
      </div>
    )
  }

  if (!project) return null

  const activeConcept = project.concepts.find(c => c.state === "active")
  const queue = project.concepts
    .filter(c => c.state !== "active")
    .sort((a, b) => {
      const order = { ready:0, in_progress:1, mastered:2, locked:3 }
      return (order[a.state] ?? 9) - (order[b.state] ?? 9)
    })

  const total = project.concepts.length
  const mastered = project.concepts.filter(c => c.state === "mastered").length
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0

  const handleStart = () => {
    if (!activeConcept) return
    setActiveConcept(activeConcept)
    setActiveView("checkpoint")
  }

  return (
    <div style={{ flex:1, overflowY:"auto", padding:"28px 24px" }}>

      {/* ── Project header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:"28px" }}>
        <div style={{
          fontSize:"9px", fontWeight:"600", letterSpacing:"0.12em",
          color:"var(--text-dim)", fontFamily:'"Fira Code",monospace',
          marginBottom:"6px",
        }}>
          LEARNING ROADMAP
        </div>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:"12px" }}>
          <h2 style={{
            margin:0, fontSize:"18px", fontWeight:"700",
            color:"var(--text-primary)", lineHeight:"1.2",
            fontFamily:'"Fira Sans", sans-serif',
          }}>
            {project.name}
          </h2>
          <span style={{
            fontSize:"11px", fontWeight:"600",
            color: pct === 100 ? "var(--accent-green)" : "var(--accent-blue)",
            fontFamily:'"Fira Code",monospace',
            flexShrink:0,
          }}>
            {pct}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          height:"2px", background:"var(--border)", borderRadius:"2px", marginTop:"10px",
        }}>
          <div style={{
            height:"2px",
            width:`${pct}%`,
            background:"linear-gradient(90deg, var(--accent-blue), var(--accent-green))",
            borderRadius:"2px",
            transition:"width 400ms ease",
          }}/>
        </div>
        <div style={{ fontSize:"10px", color:"var(--text-dim)", marginTop:"5px" }}>
          {mastered} of {total} concepts mastered
        </div>
      </div>

      {/* ── Active concept card ────────────────────────────────────────── */}
      {activeConcept && (
        <div style={{
          background:"var(--bg-panel)",
          border:"1px solid var(--border)",
          borderRadius:"10px",
          padding:"20px 20px 18px",
          marginBottom:"28px",
          position:"relative",
          overflow:"hidden",
        }}>
          {/* Left glow accent */}
          <div style={{
            position:"absolute", left:0, top:0, bottom:0, width:"3px",
            background:"linear-gradient(180deg, var(--accent-blue) 0%, rgba(56,189,248,0.2) 100%)",
            borderRadius:"0 0 0 10px",
          }}/>

          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
            <div style={{
              width:"7px", height:"7px", borderRadius:"50%",
              background:"var(--accent-blue)",
              animation:"pulseDot 1.2s ease-in-out infinite",
              transformOrigin:"center", flexShrink:0,
            }}/>
            <span style={{
              fontSize:"10px", fontWeight:"600",
              color:"var(--accent-blue)",
              fontFamily:'"Fira Code",monospace',
              letterSpacing:"0.07em",
            }}>
              UP NEXT
            </span>
          </div>

          <div style={{
            fontSize:"16px", fontWeight:"700",
            color:"var(--text-primary)",
            marginBottom:"8px",
            fontFamily:'"Fira Sans", sans-serif',
          }}>
            {activeConcept.label}
          </div>

          <div style={{
            fontSize:"11px", color:"var(--text-muted)", marginBottom:"18px",
            fontFamily:'"Fira Code",monospace',
          }}>
            {activeConcept.phase}
            {activeConcept.confidence != null && (
              <span style={{ marginLeft:"10px", color:"var(--text-dim)" }}>
                confidence: {activeConcept.confidence}
              </span>
            )}
          </div>

          <button onClick={handleStart} style={{
            background:"var(--accent-blue)",
            color:"#000",
            border:"none",
            borderRadius:"8px",
            padding:"8px 20px",
            fontWeight:"700",
            fontSize:"12px",
            cursor:"pointer",
            fontFamily:'"Fira Sans", sans-serif',
            letterSpacing:"0.02em",
            transition:"opacity 150ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity="1"}
          >
            Start Checkpoint →
          </button>
        </div>
      )}

      {!activeConcept && (
        <div style={{
          background:"var(--bg-panel)",
          border:"1px solid var(--border)",
          borderLeft:"3px solid var(--accent-green)",
          borderRadius:"10px",
          padding:"18px 20px",
          marginBottom:"28px",
          color:"var(--text-muted)",
          fontSize:"13px",
          display:"flex", alignItems:"center", gap:"10px",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="var(--accent-green)" strokeWidth="1.5" opacity="0.6"/>
            <polyline points="4.5,8 7,10.5 11.5,5.5" stroke="var(--accent-green)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
          All concepts complete!
        </div>
      )}

      {/* ── Concept queue ─────────────────────────────────────────────── */}
      {queue.length > 0 && (
        <>
          <div style={{
            fontSize:"9px", fontWeight:"600", letterSpacing:"0.12em",
            color:"var(--text-dim)", fontFamily:'"Fira Code",monospace',
            marginBottom:"10px",
          }}>
            CONCEPT QUEUE
          </div>
          <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"8px" }}>
            {queue.map(c => {
              const clickable = c.state !== "locked"
              return (
                <div
                  key={c.id}
                  onClick={() => { if (clickable) { setActiveConcept(c); setActiveView("checkpoint") } }}
                  style={{
                    background:"var(--bg-panel)",
                    border:"1px solid var(--border)",
                    borderRadius:"8px",
                    padding:"10px 12px",
                    width:"148px", minWidth:"148px",
                    cursor: clickable ? "pointer" : "default",
                    opacity: c.state === "locked" ? 0.4 : 1,
                    transition:"background 150ms ease, border-color 150ms ease",
                  }}
                  onMouseEnter={e => clickable && (
                    e.currentTarget.style.background = "rgba(255,255,255,0.025)",
                    e.currentTarget.style.borderColor = "var(--text-dim)"
                  )}
                  onMouseLeave={e => (
                    e.currentTarget.style.background = "var(--bg-panel)",
                    e.currentTarget.style.borderColor = "var(--border)"
                  )}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:"5px", marginBottom:"6px" }}>
                    <MiniRing state={c.state}/>
                    <span style={{
                      fontSize:"9px", color:STATE_COLORS[c.state], fontWeight:"700",
                      fontFamily:'"Fira Code",monospace', letterSpacing:"0.06em",
                    }}>
                      {STATE_LABELS[c.state]?.toUpperCase() ?? c.state.toUpperCase()}
                    </span>
                  </div>
                  <div style={{
                    fontSize:"11px", color:"var(--text-primary)",
                    lineHeight:"1.35", wordBreak:"break-word",
                    fontFamily:'"Fira Sans", sans-serif',
                  }}>
                    {c.label}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
