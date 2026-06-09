export default function MobileBar({ onMenuClick, onTreeClick }) {
  const btnStyle = {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    borderRadius: "8px",
  }

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
      zIndex: 40,
    }}>
      <button onClick={onMenuClick} style={btnStyle} title="Menu">
        ☰
      </button>
      <button onClick={onTreeClick} style={btnStyle} title="Concept tree">
        🌿
      </button>
    </div>
  )
}
