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

function Logo({ size = 14 }) {
  return (
    <span style={{
      display:"inline-flex",
      fontFamily:'"Fira Code", monospace',
      fontSize:`${size}px`, fontWeight:"700",
      letterSpacing:"0.08em", color:"var(--text-primary)",
    }}>
      {["P","I","P"].map((ch, i) => (
        <span key={i} style={{
          display:"inline-flex", flexDirection:"column", alignItems:"center",
        }}>
          {ch}
          <span style={{
            width:"70%", height:"1.5px", marginTop:"-3px", borderRadius:"1px",
            background: ["#38bdf8","#f59e0b","#22c55e"][i],
          }}/>
        </span>
      ))}
    </span>
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

function IconTrash() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h8M4.5 3V2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M5 5.5v3M7 5.5v3M2.5 3l.5 6.5a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9L9.5 3"/>
    </svg>
  )
}

function HoverItem({ isActive, onClick, title, children, disabled }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      title={title}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (!disabled && (e.key === "Enter" || e.key === " ")) onClick?.() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isActive
          ? "rgba(56,189,248,0.07)"
          : hovered ? "rgba(255,255,255,0.03)" : "none",
        border: "none",
        borderRadius: "7px",
        cursor: disabled ? "default" : "pointer",
        padding: "6px 7px",
        display: "flex", alignItems: "center",
        width: "100%", textAlign: "left",
        marginBottom: "1px",
        boxSizing: "border-box",
        borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
        boxShadow: isActive ? "inset 4px 0 12px rgba(56,189,248,0.08)" : "none",
        transition: "background 150ms ease, box-shadow 150ms ease, border-color 150ms ease",
        color: isActive ? "var(--text-primary)" : hovered ? "var(--text-primary)" : "var(--text-muted)",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      {typeof children === "function" ? children(hovered) : children}
    </div>
  )
}

export default function Sidebar({ open, onToggle, mobile = false }) {
  const { user, logout } = useAuth()
  const { activeProjectId, setActiveProjectId, setActiveConcept, projects, setProjects, pendingName, setPendingName } = useProject()
  const { dark, toggle: toggleTheme } = useTheme()
  const [creating, setCreating] = useState(false)
  const [newPlan, setNewPlan] = useState("")
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user) return
    api.getProjects().then(setProjects).catch(() => {})
  }, [user, setProjects])
  useEffect(() => { if (creating) inputRef.current?.focus() }, [creating])

  const handleCreate = (e) => {
    e.preventDefault()
    const name = newPlan.trim()
    if (!name) return
    setPendingName(name)
    setActiveProjectId(null)
    setActiveConcept(null)
    setCreating(false)
    setNewPlan("")
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteProject(deleteTarget.id)
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id))
      if (activeProjectId === deleteTarget.id) {
        setActiveProjectId(null)
        setActiveConcept(null)
        setPendingName(null)
      }
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
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
      paddingBottom: mobile ? "52px" : 0,
      boxSizing: "border-box",
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      {open ? (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:"6px",
          padding:"10px 8px",
          minHeight:"48px",
          borderBottom:"1px solid var(--border-subtle)",
        }}>
          <Logo/>

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
          padding:"10px 0 8px",
          borderBottom:"1px solid var(--border-subtle)",
        }}>
          <button onClick={onToggle} title="Expand sidebar"
            style={iconBtn({ color:"var(--text-muted)" })}
            aria-label="Expand sidebar">
            <IconPanelLeft active={false}/>
          </button>
        </div>
      )}

      {/* ── New project ──────────────────────────────────────────────────── */}
      <div style={{ padding:"8px 6px 4px" }}>
        {creating && open ? (
          <form onSubmit={handleCreate}>
            <input ref={inputRef} value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              placeholder="Project name…"
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
              <button type="submit" style={{
                flex:1, background:"var(--accent-blue)", color:"#000",
                border:"none", borderRadius:"6px", fontSize:"11px",
                fontWeight:"700", padding:"5px 0", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"inherit",
              }}>
                Start
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
          const isActive = p.id === activeProjectId && !pendingName
          return (
            <HoverItem
              key={p.id}
              isActive={isActive}
              onClick={() => { setActiveProjectId(p.id); setPendingName(null); setActiveConcept(null) }}
              title={p.name}
            >
              {(hovered) => (
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
                  {open && isActive && !hovered && (
                    <div style={{
                      width:"5px", height:"5px", borderRadius:"50%",
                      background:"var(--accent-blue)", flexShrink:0,
                      opacity:0.8,
                    }}/>
                  )}
                  {open && hovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}
                      title="Delete project"
                      aria-label="Delete project"
                      style={{
                        ...iconBtn(),
                        width:"20px", height:"20px",
                        color:"var(--text-dim)",
                        flexShrink:0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--accent-red)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-dim)"}
                    >
                      <IconTrash/>
                    </button>
                  )}
                </div>
              )}
            </HoverItem>
          )
        })}
        {projects.length === 0 && open && (
          <p style={{ fontSize:"11px", color:"var(--text-dim)", padding:"10px 7px", lineHeight:"1.5" }}>
            No projects yet.<br/>Create one above, or{" "}
            <button
              onClick={async () => {
                const { project_id } = await api.cloneDemo()
                const updated = await api.getProjects()
                setProjects(updated)
                setActiveProjectId(project_id)
                setActiveConcept(null)
              }}
              style={{
                background:"none", border:"none", padding:0,
                color:"var(--accent-blue)", cursor:"pointer",
                fontSize:"11px", textDecoration:"underline",
              }}
            >
              try the demo
            </button>.
          </p>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      {open ? (
        <div style={{
          display:"flex", alignItems:"center", gap:"6px",
          padding:"10px 8px",
          minHeight:"57px",
          borderTop:"1px solid var(--border-subtle)",
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
        </div>
      ) : (
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          padding:"8px 0 10px", gap:"4px",
          borderTop:"1px solid var(--border-subtle)",
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
          <button onClick={toggleTheme} title={dark?"Light mode":"Dark mode"}
            style={iconBtn({ color:"var(--text-muted)" })}>
            {dark ? <IconSun/> : <IconMoon/>}
          </button>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{
          position:"fixed", inset:0, zIndex:1000,
          background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}
        onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background:"var(--bg-panel)",
            border:"1px solid var(--border)",
            borderRadius:"10px",
            padding:"18px",
            width:"260px",
            boxShadow:"0 8px 30px rgba(0,0,0,0.4)",
          }}>
            <div style={{
              fontSize:"13px", fontWeight:"600", color:"var(--text-primary)",
              marginBottom:"6px",
            }}>
              Delete project?
            </div>
            <div style={{
              fontSize:"11px", color:"var(--text-muted)", lineHeight:"1.5",
              marginBottom:"16px",
            }}>
              "{deleteTarget.name}" and all of its progress will be permanently deleted. This can't be undone.
            </div>
            <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{
                background:"none", border:"1px solid var(--border)",
                borderRadius:"6px", color:"var(--text-muted)",
                fontSize:"11px", padding:"6px 12px",
                cursor: deleting ? "default" : "pointer",
                fontFamily:"inherit",
              }}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} style={{
                background:"var(--accent-red)", border:"none",
                borderRadius:"6px", color:"#fff",
                fontSize:"11px", fontWeight:"700", padding:"6px 12px",
                cursor: deleting ? "wait" : "pointer",
                opacity: deleting ? 0.7 : 1,
                fontFamily:"inherit",
              }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
