export default function Drawer({ open, onClose, side, children }) {
  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 49,
          }}
        />
      )}
      <div style={{
        position: "fixed",
        top: 0,
        [side]: 0,
        width: "100vw",
        height: "100vh",
        background: "var(--bg-panel)",
        zIndex: 50,
        transform: open
          ? "translateX(0)"
          : side === "left"
            ? "translateX(-100%)"
            : "translateX(100%)",
        transition: "transform 250ms ease",
        overflow: "auto",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "20px",
            zIndex: 1,
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
        {children}
      </div>
    </>
  )
}
