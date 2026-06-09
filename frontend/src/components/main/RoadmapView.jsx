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

function MiniRing({ state }) {
  const color = STATE_COLORS[state] || "var(--accent-gray)"
  return (
    <svg width="12" height="12" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
        Loading…
      </div>
    )
  }

  if (!project) return null

  const activeConcept = project.concepts.find(c => c.state === "active")
  const queue = project.concepts.filter(c => c.state !== "active")
    .sort((a, b) => {
      const order = { ready: 0, in_progress: 1, mastered: 2, locked: 3 }
      return (order[a.state] ?? 9) - (order[b.state] ?? 9)
    })

  const handleStart = () => {
    if (!activeConcept) return
    setActiveConcept(activeConcept)
    setActiveView("checkpoint")
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
        {project.name}
      </h2>

      {activeConcept && (
        <div style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent-blue)",
          borderRadius: "10px",
          padding: "20px 24px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: "var(--accent-blue)",
              animation: "pulseDot 1.2s ease-in-out infinite",
              transformOrigin: "center",
            }} />
            <span style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
              {activeConcept.label}
            </span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
            Phase: {activeConcept.phase} · Confidence: {activeConcept.confidence ?? "N/A"}
          </div>
          <button
            onClick={handleStart}
            style={{
              background: "var(--accent-blue)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "8px 20px",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Start Checkpoint →
          </button>
        </div>
      )}

      {!activeConcept && (
        <div style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px 24px",
          marginBottom: "24px",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}>
          🎉 All concepts complete!
        </div>
      )}

      {queue.length > 0 && (
        <>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "10px" }}>
            CONCEPT QUEUE
          </div>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
            {queue.map(c => (
              <div
                key={c.id}
                onClick={() => { if (c.state !== "locked") { setActiveConcept(c); setActiveView("checkpoint") } }}
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  width: "140px",
                  minWidth: "140px",
                  cursor: c.state === "locked" ? "default" : "pointer",
                  opacity: c.state === "locked" ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                  <MiniRing state={c.state} />
                  <span style={{ fontSize: "10px", color: STATE_COLORS[c.state], fontWeight: "600" }}>
                    {c.state.replace("_", " ")}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-primary)", lineHeight: "1.3", wordBreak: "break-word" }}>
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
