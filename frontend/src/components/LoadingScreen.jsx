export default function LoadingScreen() {
  return (
    <div style={{
      height: "100vh",
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "14px",
      }}>
        <span style={{
          display: "inline-flex",
          fontFamily: '"Fira Code", monospace',
          fontSize: "28px",
          fontWeight: "700",
          letterSpacing: "0.08em",
          color: "var(--text-primary)",
        }}>
          {["P", "I", "P"].map((ch, i) => (
            <span key={i} style={{
              display: "inline-flex", flexDirection: "column", alignItems: "center",
            }}>
              {ch}
              <span className="pulse-dot" style={{
                width: "70%", height: "2px", marginTop: "-4px", borderRadius: "1px",
                background: ["#38bdf8", "#f59e0b", "#22c55e"][i],
                animationDelay: `${i * 0.15}s`,
              }}/>
            </span>
          ))}
        </span>
        <span style={{
          fontSize: "11px",
          color: "var(--text-muted)",
          letterSpacing: "0.08em",
          fontFamily: '"Fira Code", monospace',
        }}>
          Loading…
        </span>
      </div>
    </div>
  )
}
