import { useEffect, useRef, useState } from "react"
import { api } from "../api"
import { useAuth } from "../context/AuthContext"
import { useProject } from "../context/ProjectContext"
import { useTheme } from "../context/ThemeContext"

export const SIDEBAR_OPEN_W  = 188
export const SIDEBAR_CLOSED_W = 44

function IconPanelLeft({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.2"/>
      {active && <rect x="1.5" y="1.5" width="3.2" height="13" rx="0.8" fill="currentColor" fillOpacity="0.3"/>}
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  )
}

function ProgressRing({ pct, color, size = 20 }) {
  const r = size / 2 - 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={2}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color || "var(--accent-blue)"} strokeWidth={2}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" style={{ animation:"spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="20 18"/>
    </svg>
  )
}

function HoverItem({ isActive, onClick, title, children, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isActive
          ? "rgba(56,189,248,0.07)"
          : hovered ? "rgba(255,255,255,0.03)" : "none",
        border: "none",
        borderRadius: "7px",
        cursor: "pointer",
        padding: "6px 7px",
        display: "flex", alignItems: "center",
        width: "100%", textAlign: "left",
        marginBottom: "1px",
        borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
        boxShadow: isActive ? "inset 4px 0 12px rgba(56,189,248,0.08)" : "none",
        transition: "background 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
        color: isActive ? "var(--text-primary)" : hovered ? "var(--text-primary)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  )
}

export default function Sidebar({ open, onToggle }) {
  const { user, logout } = useAuth()
  const { activeProjectId, setActiveProjectId, projects, setProjects, setActiveView } = useProject()
  const { dark, toggle: toggleTheme } = useTheme()
  const [creating, setCreating] = useState(false)
  const [newPlan, setNewPlan] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { api.getProjects().then(setProjects).catch(console.error) }, [setProjects])
  useEffect(() => { if (creating) inputRef.current?.focus() }, [creating])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newPlan.trim()) return
    setLoading(true)
    try {
      const result = await api.createRoadmap(newPlan.trim())
      const updated = await api.getProjects()
      setProjects(updated)
      setActiveProjectId(result.project_id)
      setActiveView("roadmap")
      setCreating(false)
      setNewPlan("")
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "?"

  const iconBtn = (extra = {}) => ({
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "6px", transition: "color 150ms ease",
    width: "28px", height: "28px", flexShrink: 0,
    ...extra,
  })

  return (
    <div style={{
      width: open ? `${SIDEBAR_OPEN_W}px` : `${SIDEBAR_CLOSED_W}px`,
      minWidth: open ? `${SIDEBAR_OPEN_W}px` : `${SIDEBAR_CLOSED_W}px`,
      height: "100vh",
      background: "var(--bg-panel)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 200ms ease, min-width 200ms ease",
      overflow: "hidden", flexShrink: 0,
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      {open ? (
        <div style={{
          display:"flex", alignItems:"center", gap:"6px",
          padding:"10px 8px",
          minHeight:"48px",
          borderBottom:"1px solid var(--border-subtle)",
        }}>
          {/* Avatar */}
          <div style={{
            width:"26px", height:"26px", borderRadius:"50%",
            background:"linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
            color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"11px", fontWeight:"700", flexShrink:0,
            fontFamily:'"Fira Sans", sans-serif',
          }}>
            {initials}
          </div>

          {/* Name + sign out */}
          <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
            <div style={{
              fontSize:"11px", fontWeight:"600", color:"var(--text-primary)",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            }}>
              {user?.name || "User"}
            </div>
            <button onClick={logout} style={{
              ...iconBtn(), width:"auto", height:"auto",
              fontSize:"10px", color:"var(--text-muted)", padding:0,
            }}>
              Sign out
            </button>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={dark?"Light mode":"Dark mode"}
            style={iconBtn({ color:"var(--text-muted)" })}>
            {dark ? <IconSun/> : <IconMoon/>}
          </button>

          {/* Sidebar toggle — white when open */}
          <button onClick={onToggle} title="Collapse sidebar"
            style={iconBtn({ color:"var(--text-primary)" })}
            aria-label="Collapse sidebar">
            <IconPanelLeft active={true}/>
          </button>
        </div>
      ) : (
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"10px 0 8px", gap:"4px",
          borderBottom:"1px solid var(--border-subtle)",
          paddingBottom:"12px",
        }}>
          <div style={{
            width:"26px", height:"26px", borderRadius:"50%",
            background:"linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)",
            color:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"11px", fontWeight:"700",
            fontFamily:'"Fira Sans", sans-serif',
          }}>
            {initials}
          </div>
          <button onClick={onToggle} title="Expand sidebar"
            style={iconBtn({ color:"var(--text-muted)" })}
            aria-label="Expand sidebar">
            <IconPanelLeft active={false}/>
          </button>
          <button onClick={toggleTheme} title={dark?"Light mode":"Dark mode"}
            style={iconBtn({ color:"var(--text-muted)" })}>
            {dark ? <IconSun/> : <IconMoon/>}
          </button>
        </div>
      )}

      {/* ── New project ──────────────────────────────────────────────────── */}
      <div style={{ padding:"8px 6px 4px" }}>
        {creating && open ? (
          <form onSubmit={handleCreate}>
            <input ref={inputRef} value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              placeholder="Subject to learn…" disabled={loading}
              style={{
                width:"100%", background:"var(--bg-elevated)",
                border:"1px solid var(--border)", borderRadius:"7px",
                color:"var(--text-primary)", fontSize:"11px",
                padding:"5px 8px", outline:"none", marginBottom:"4px",
                fontFamily:"inherit",
                transition:"border-color 150ms ease",
              }}
            />
            <div style={{ display:"flex", gap:"4px" }}>
              <button type="submit" disabled={loading} style={{
                flex:1, background:"var(--accent-blue)", color:"#000",
                border:"none", borderRadius:"6px", fontSize:"11px",
                fontWeight:"700", padding:"5px 0", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"inherit",
              }}>
                {loading ? <Spinner/> : "Create"}
              </button>
              <button type="button" onClick={() => setCreating(false)} style={{
                ...iconBtn(), border:"1px solid var(--border)",
                borderRadius:"6px", fontSize:"10px", width:"auto", padding:"5px 8px",
                color:"var(--text-muted)",
              }}>✕</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setCreating(true)} title="New project" style={{
            background:"none",
            border:"1px solid var(--border)",
            cursor:"pointer",
            borderRadius:"7px",
            color:"var(--text-muted)",
            fontSize:"11px",
            padding:"5px 6px",
            display:"flex", alignItems:"center",
            justifyContent: open ? "flex-start" : "center",
            gap:"6px", width:"100%",
            transition:"color 150ms ease, border-color 150ms ease, background 150ms ease",
            fontFamily:"inherit",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = "var(--text-primary)"
            e.currentTarget.style.borderColor = "var(--text-dim)"
            e.currentTarget.style.background = "rgba(255,255,255,0.02)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = "var(--text-muted)"
            e.currentTarget.style.borderColor = "var(--border)"
            e.currentTarget.style.background = "none"
          }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11"/>
              <line x1="1" y1="6" x2="11" y2="6"/>
            </svg>
            {open && <span>New project</span>}
          </button>
        )}
      </div>

      {/* ── Section label ────────────────────────────────────────────────── */}
      {open && projects.length > 0 && (
        <div style={{
          padding:"8px 14px 4px",
          fontSize:"9px",
          fontWeight:"600",
          letterSpacing:"0.12em",
          color:"var(--text-dim)",
          fontFamily:'"Fira Code", monospace',
        }}>
          PROJECTS
        </div>
      )}

      {/* ── Project list ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"2px 6px" }}>
        {projects.map(p => {
          const pct = p.total_concepts > 0
            ? Math.round((p.mastered_concepts / p.total_concepts) * 100) : 0
          const isActive = p.id === activeProjectId
          return (
            <HoverItem
              key={p.id}
              isActive={isActive}
              onClick={() => { setActiveProjectId(p.id); setActiveView("roadmap") }}
              title={p.name}
            >
              <div style={{ display:"flex", alignItems:"center", gap:"7px", width:"100%" }}>
                <ProgressRing pct={pct} color={isActive ? "var(--accent-blue)" : "var(--accent-gray)"}/>
                {open && (
                  <span style={{
                    fontSize:"11px",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    flex:1,
                  }}>
                    {p.name}
                  </span>
                )}
                {open && isActive && (
                  <div style={{
                    width:"5px", height:"5px", borderRadius:"50%",
                    background:"var(--accent-blue)", flexShrink:0,
                    opacity:0.8,
                  }}/>
                )}
              </div>
            </HoverItem>
          )
        })}
        {projects.length === 0 && open && (
          <p style={{ fontSize:"11px", color:"var(--text-dim)", padding:"10px 7px", lineHeight:"1.5" }}>
            No projects yet.<br/>Create one above.
          </p>
        )}
      </div>
    </div>
  )
}
