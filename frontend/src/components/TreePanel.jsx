import { useState } from "react"
import { ConceptTree } from "./tree/ConceptTree"
import ConceptDetail from "./tree/ConceptDetail"
import { api } from "../api"
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

export default function TreePanel({ open, sidebarOpen, treePct = 0.40, onResizeStart, onToggle, treeRef, mobile = false }) {
  const { activeProjectId, projects } = useProject()
  const [selectedConcept, setSelectedConcept] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const activeProject = projects.find(p => p.id === activeProjectId)

  async function handleMaster() {
    if (!activeProjectId || !selectedConcept) return
    await api.masterConcept(activeProjectId, selectedConcept.id)
    setSelectedConcept(null)
    setRefreshKey(k => k + 1)
  }

  const sidebarW = sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_CLOSED_W
  const panelW = mobile
    ? "100vw"
    : open
      ? `calc((100vw - ${sidebarW}px) * ${treePct})`
      : `${STRIP_W}px`

  return (
    <div style={{
      width: panelW,
      minWidth: panelW,
      height: mobile ? "100svh" : "100vh",
      display: "flex",
      flexDirection: "row",
      transition: open ? "none" : "width 200ms ease, min-width 200ms ease",
      borderLeft: mobile ? "none" : "1px solid var(--border)",
      background: "var(--bg-panel)",
      flexShrink: 0,
      overflow: "hidden",
      position: "relative",
      paddingBottom: mobile ? "52px" : 0,
      boxSizing: "border-box",
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
      {!mobile && (
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
      )}

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
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: "9px", fontWeight: "600", letterSpacing: "0.12em",
                  color: "var(--text-dim)", fontFamily: '"Fira Code",monospace',
                  marginBottom: "4px",
                }}>
                  CONCEPT MAP
                </div>
                <div style={{
                  fontSize: "13px", fontWeight: "700", color: "var(--text-primary)",
                  fontFamily: '"Fira Sans", sans-serif',
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {activeProject?.name || "Untitled project"}
                </div>
              </div>
              {mobile && onToggle && (
                <button
                  onClick={onToggle}
                  title="Close concept tree"
                  aria-label="Close concept tree"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "28px", height: "28px", borderRadius: "6px",
                    flexShrink: 0,
                  }}
                >
                  <IconPanelRight active={true} />
                </button>
              )}
            </div>
            <ConceptTree
              ref={treeRef}
              projectId={activeProjectId}
              onNodeSelect={(node) => setSelectedConcept(node)}
              refreshKey={refreshKey}
            />
            <ConceptDetail
              concept={selectedConcept}
              onClose={() => setSelectedConcept(null)}
              onMaster={handleMaster}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: "11px", textAlign: "center", padding: "16px",
            position: "relative",
          }}>
            {mobile && onToggle && (
              <button
                onClick={onToggle}
                title="Close concept tree"
                aria-label="Close concept tree"
                style={{
                  position: "absolute", top: "10px", right: "10px",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "28px", height: "28px", borderRadius: "6px",
                }}
              >
                <IconPanelRight active={true} />
              </button>
            )}
            Select a project to see the concept map
          </div>
        )}
      </div>
    </div>
  )
}
