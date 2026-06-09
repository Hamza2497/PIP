import { useState } from "react"
import { ConceptTree } from "./tree/ConceptTree"
import ConceptDetail from "./tree/ConceptDetail"

import { useProject } from "../context/ProjectContext"
import { SIDEBAR_OPEN_W, SIDEBAR_CLOSED_W } from "./Sidebar"

const STRIP_W = 32

function IconPanelRight({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10.5" y1="1" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1.2" />
      {active && <rect x="11.3" y="1.5" width="3.2" height="13" rx="0.8" fill="currentColor" fillOpacity="0.25" />}
    </svg>
  )
}

export default function TreePanel({ open, sidebarOpen, treePct = 0.40, onResizeStart, onToggle }) {
  const { activeProjectId } = useProject()
  const [selectedConcept, setSelectedConcept] = useState(null)

  const sidebarW = sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W
  const panelW = open
    ? `calc((100vw - ${sidebarW}px) * ${treePct})`
    : `${STRIP_W}px`

  return (
    <div style={{
      width: panelW,
      minWidth: panelW,
      height: "100vh",
      display: "flex",
      flexDirection: "row",
      transition: open ? "none" : "width 200ms ease, min-width 200ms ease",
      borderLeft: "1px solid var(--border)",
      background: "var(--bg-panel)",
      flexShrink: 0,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* ── Resize handle — drag to resize between 25–45% ───────────────── */}
      {open && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "5px",
            height: "100%",
            cursor: "ew-resize",
            zIndex: 20,
          }}
          title="Drag to resize"
        />
      )}

      {/* ── Always-visible toggle strip ─────────────────────────────────── */}
      <div style={{
        width: `${STRIP_W}px`,
        minWidth: `${STRIP_W}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "10px",
      }}>
        <button
          onClick={onToggle}
          title={open ? "Close concept tree" : "Open concept tree"}
          aria-label={open ? "Close concept tree" : "Open concept tree"}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: open ? "var(--text-primary)" : "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "28px", height: "28px", borderRadius: "6px",
            transition: "color 150ms ease",
          }}
        >
          <IconPanelRight active={open} />
        </button>
      </div>

      {/* ── Tree content ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        opacity: open ? 1 : 0,
        transition: "opacity 150ms ease",
        pointerEvents: open ? "auto" : "none",
        position: "relative",
      }}>
        {activeProjectId ? (
          <>
            <ConceptTree
              projectId={activeProjectId}
              onNodeSelect={(node) => setSelectedConcept(node)}
            />
            <ConceptDetail
              concept={selectedConcept}
              onClose={() => setSelectedConcept(null)}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: "11px", textAlign: "center", padding: "16px",
          }}>
            Select a project to see the concept tree
          </div>
        )}
      </div>
    </div>
  )
}
