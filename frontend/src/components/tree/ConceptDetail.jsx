const STATE_COLORS = {
  mastered:    "#22c55e",
  in_progress: "#f59e0b",
  active:      "#38bdf8",
  ready:       "#52525b",
  locked:      "#ef4444",
}

export default function ConceptDetail({ concept, onClose }) {
  const color = concept ? STATE_COLORS[concept.state] || STATE_COLORS.ready : null

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "160px",
      background: "var(--bg-elevated)",
      borderTop: "1px solid var(--border)",
      padding: "12px 16px",
      transform: concept ? "translateY(0)" : "translateY(100%)",
      transition: "transform 250ms ease",
      zIndex: 10,
    }}>
      {concept && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {concept.label}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{
                  fontSize: "10px",
                  color: color,
                  background: `${color}22`,
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontWeight: "600",
                }}>
                  {concept.state.replace("_", " ")}
                </span>
                {concept.confidence != null && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    Confidence: {concept.confidence}/5
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "16px", padding: "2px 6px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            Phase: {concept.phase}
            {concept.prereqs?.length > 0 && ` · ${concept.prereqs.length} prerequisite${concept.prereqs.length !== 1 ? "s" : ""}`}
          </div>
        </>
      )}
    </div>
  )
}
