import { useEffect, useRef, useState } from "react"
import { api } from "../api"
import { useAuth } from "../context/AuthContext"
import { useProject } from "../context/ProjectContext"
import { useTheme } from "../context/ThemeContext"

export const SIDEBAR_OPEN_W  = 180
export const SIDEBAR_CLOSED_W = 44

function IconPanelLeft({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.2" />
      {active && <rect x="1.5" y="1.5" width="3.2" height="13" rx="0.8" fill="currentColor" fillOpacity="0.25" />}
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function ProgressRing({ pct, color, size = 20 }) {
  const r = size / 2 - 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color || "var(--accent-blue)"} strokeWidth={2}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" style={{ animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeDasharray="20 18" />
    </svg>
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

  const iconBtn = (extraStyle = {}) => ({
    background: "none", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    borderRadius: "6px", transition: "color 150ms ease",
    width: "28px", height: "28px", flexShrink: 0,
    ...extraStyle,
  })

  return (
    <div style={{
      width: open ? `${SIDEBAR_OPEN_W}px` : `${SIDEBAR_CLOSED_W}px`,
      minWidth: open ? `${SIDEBAR_OPEN_W}px` : `${SIDEBAR_CLOSED_W}px`,
      height: "100vh",
      background: "var(--bg-panel)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      transition: "width 200ms ease, min-width 200ms ease",
      overflow: "hidden",
      flexShrink: 0,
    }}>

      {/* ── Header: avatar + name + theme + panel toggle ─────────────────── */}
      {open ? (
        /* Open: single horizontal row */
        <div style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "10px 8px", minHeight: "50px",
        }}>
          {/* Avatar */}
          <div style={{
            width: "26px", height: "26px", borderRadius: "50%",
            background: "var(--accent-blue)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: "700", flexShrink: 0,
          }}>
            {initials}
          </div>

          {/* Name + sign out */}
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
            <div style={{
              fontSize: "11px", fontWeight: "600", color: "var(--text-primary)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {user?.name || "User"}
            </div>
            <button onClick={logout} style={{
              ...iconBtn(), width: "auto", height: "auto",
              fontSize: "10px", color: "var(--text-muted)", padding: 0,
            }}>
              Sign out
            </button>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"}
            style={iconBtn({ color: "var(--text-muted)" })}>
            {dark ? <IconSun /> : <IconMoon />}
          </button>

          {/* Sidebar toggle — white when open */}
          <button onClick={onToggle} title="Collapse sidebar"
            style={iconBtn({ color: "var(--text-primary)" })}
            aria-label="Collapse sidebar">
            <IconPanelLeft active={true} />
          </button>
        </div>
      ) : (
        /* Collapsed: vertical stack, centered */
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "10px 0 8px", gap: "4px",
        }}>
          {/* Avatar always visible */}
          <div style={{
            width: "26px", height: "26px", borderRadius: "50%",
            background: "var(--accent-blue)", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: "700",
          }}>
            {initials}
          </div>

          {/* Sidebar toggle — gray when collapsed */}
          <button onClick={onToggle} title="Expand sidebar"
            style={iconBtn({ color: "var(--text-muted)" })}
            aria-label="Expand sidebar">
            <IconPanelLeft active={false} />
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={dark ? "Light mode" : "Dark mode"}
            style={iconBtn({ color: "var(--text-muted)" })}>
            {dark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      )}

      {/* ── New project ───────────────────────────────────────────────────── */}
      <div style={{ padding: "6px 6px 4px" }}>
        {creating && open ? (
          <form onSubmit={handleCreate}>
            <input ref={inputRef} value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              placeholder="Subject to learn…" disabled={loading}
              style={{
                width: "100%", background: "var(--bg-elevated)",
                border: "1px solid var(--border)", borderRadius: "6px",
                color: "var(--text-primary)", fontSize: "11px",
                padding: "5px 7px", outline: "none", marginBottom: "4px",
              }}
            />
            <div style={{ display: "flex", gap: "4px" }}>
              <button type="submit" disabled={loading} style={{
                flex: 1, background: "var(--accent-blue)", color: "#000",
                border: "none", borderRadius: "5px", fontSize: "10px",
                fontWeight: "600", padding: "4px 0", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {loading ? <Spinner /> : "Create"}
              </button>
              <button type="button" onClick={() => setCreating(false)} style={{
                ...iconBtn(), border: "1px solid var(--border)",
                borderRadius: "5px", fontSize: "10px", width: "auto", padding: "4px 8px",
                color: "var(--text-muted)",
              }}>✕</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setCreating(true)} title="New project" style={{
            background: "none", border: "1px solid var(--border)", cursor: "pointer",
            borderRadius: "6px", color: "var(--text-muted)", fontSize: "11px",
            padding: "5px 6px", display: "flex", alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            gap: "6px", width: "100%",
            transition: "color 150ms ease",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
            {open && <span>New project</span>}
          </button>
        )}
      </div>

      {/* ── Project list ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 6px" }}>
        {projects.map(p => {
          const pct = p.total_concepts > 0
            ? Math.round((p.mastered_concepts / p.total_concepts) * 100) : 0
          const isActive = p.id === activeProjectId
          return (
            <button key={p.id}
              onClick={() => { setActiveProjectId(p.id); setActiveView("roadmap") }}
              title={p.name}
              style={{
                background: isActive ? "rgba(56,189,248,0.06)" : "none",
                border: "none", cursor: "pointer", borderRadius: "6px",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                padding: "5px 6px", display: "flex", alignItems: "center",
                justifyContent: open ? "flex-start" : "center",
                gap: "7px", width: "100%", textAlign: "left", marginBottom: "1px",
                borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                transition: "background 150ms ease",
              }}
            >
              <ProgressRing pct={pct} color={isActive ? "var(--accent-blue)" : undefined} />
              {open && (
                <span style={{
                  fontSize: "11px", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.name}
                </span>
              )}
            </button>
          )
        })}
        {projects.length === 0 && open && (
          <p style={{ fontSize: "11px", color: "var(--text-muted)", padding: "8px 6px" }}>
            No projects yet
          </p>
        )}
      </div>
    </div>
  )
}
