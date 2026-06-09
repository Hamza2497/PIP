import { useProject } from "../context/ProjectContext"
import RoadmapView from "./main/RoadmapView"
import CheckpointChat from "./main/CheckpointChat"

function EmptyState() {
  return (
    <div style={{
      flex:1,
      display:"flex", alignItems:"center", justifyContent:"center",
      flexDirection:"column", gap:"14px",
      color:"var(--text-dim)",
    }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="16" stroke="var(--border)" strokeWidth="1.5"/>
        <circle cx="18" cy="18" r="8" stroke="var(--text-dim)" strokeWidth="1.2" strokeDasharray="3 2"/>
        <circle cx="18" cy="10" r="2" fill="var(--text-dim)" opacity="0.6"/>
        <circle cx="24.9" cy="14" r="2" fill="var(--text-dim)" opacity="0.4"/>
        <circle cx="24.9" cy="22" r="2" fill="var(--border)" opacity="0.5"/>
        <circle cx="18" cy="26" r="2" fill="var(--border)" opacity="0.5"/>
      </svg>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"13px", fontWeight:"500", color:"var(--text-muted)", marginBottom:"4px" }}>
          No project selected
        </div>
        <div style={{ fontSize:"11px", color:"var(--text-dim)" }}>
          Create or select a project from the sidebar
        </div>
      </div>
    </div>
  )
}

export default function MainArea() {
  const { activeProjectId, activeView } = useProject()

  if (!activeProjectId) {
    return (
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        <EmptyState/>
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      {activeView === "roadmap" ? <RoadmapView/> : <CheckpointChat/>}
    </div>
  )
}
