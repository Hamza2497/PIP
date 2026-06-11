export default function MobileBar({ onMenuClick, onTreeClick, sidebarOpen, treeOpen }) {
  const btnStyle = (active) => ({
    background: active ? "rgba(56,189,248,0.1)" : "none",
    border: "none",
    color: active ? "var(--text-primary)" : "var(--text-muted)",
    cursor: "pointer",
    fontSize: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "8px",
  })

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: "52px",
      background: "var(--bg-panel)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      zIndex: 60,
    }}>
      <button onClick={onMenuClick} style={btnStyle(sidebarOpen)} title="Menu">
        ☰
      </button>
      <button onClick={onTreeClick} style={btnStyle(treeOpen)} title="Concept tree">
        🌿
      </button>
    </div>
  )
}
