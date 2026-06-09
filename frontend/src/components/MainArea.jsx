import { useProject } from "../context/ProjectContext"
import RoadmapView from "./main/RoadmapView"
import CheckpointChat from "./main/CheckpointChat"

export default function MainArea() {
  const { activeProjectId, activeView } = useProject()

  if (!activeProjectId) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)",
        fontSize: "14px",
        flexDirection: "column",
        gap: "8px",
      }}>
        <div style={{ fontSize: "32px" }}>📚</div>
        <div>Select or create a project</div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {activeView === "roadmap" ? <RoadmapView /> : <CheckpointChat />}
    </div>
  )
}
