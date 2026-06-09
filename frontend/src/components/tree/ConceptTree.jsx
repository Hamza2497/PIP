import { useEffect, useState } from "react"
import { Background, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ConceptNode } from "./ConceptNode"
import { api } from "../../api"
import { getLayoutedElements } from "../../utils/treeLayout"

const nodeTypes = { concept: ConceptNode }

// ─── Zoom controls ────────────────────────────────────────────────────────────
function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  const btn = {
    width: "28px", height: "28px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    color: "var(--text-muted)",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "15px", lineHeight: 1,
    transition: "color 150ms ease, background 150ms ease",
    borderRadius: 0,
  }

  return (
    <div style={{
      position: "absolute",
      bottom: "12px",
      right: "10px",
      display: "flex",
      flexDirection: "column",
      gap: 0,
      zIndex: 10,
      borderRadius: "7px",
      overflow: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    }}>
      <button onClick={() => zoomIn({ duration: 200 })} style={btn} title="Zoom in"
        aria-label="Zoom in">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="6" y1="1" x2="6" y2="11" />
          <line x1="1" y1="6" x2="11" y2="6" />
        </svg>
      </button>
      <button onClick={() => fitView({ padding: 0.2, duration: 300 })}
        style={{ ...btn, borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
        title="Fit view" aria-label="Fit view">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" />
        </svg>
      </button>
      <button onClick={() => zoomOut({ duration: 200 })} style={btn} title="Zoom out"
        aria-label="Zoom out">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <line x1="1" y1="6" x2="11" y2="6" />
        </svg>
      </button>
    </div>
  )
}

// ─── Tree inner ───────────────────────────────────────────────────────────────
function TreeInner({ projectId, onNodeClick }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (!projectId) return
    api.getProject(projectId).then(data => {
      const rfNodes = data.concepts.map(c => ({
        id: c.id,
        type: "concept",
        data: { label: c.label, state: c.state, confidence: c.confidence },
        position: { x: 0, y: 0 },
      }))
      const rfEdges = data.concepts.flatMap(c =>
        (c.prereqs || []).map(pid => ({
          id: `${pid}->${c.id}`,
          source: pid,
          target: c.id,
          type: "smoothstep",
          style: { stroke: "rgba(255,255,255,0.11)", strokeWidth: 0.8 },
        }))
      )
      const { nodes: ln, edges: le } = getLayoutedElements(rfNodes, rfEdges)
      setNodes(ln)
      setEdges(le)
    }).catch(console.error)
  }, [projectId])

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes.map(n => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        // Scroll pans, Ctrl+scroll zooms (native browser behaviour React Flow respects)
        panOnScroll={true}
        panOnScrollMode="free"
        zoomOnScroll={false}
        zoomOnPinch={true}
        panOnDrag={true}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          setSelectedId(node.id)
          onNodeClick?.(node)
        }}
        style={{ background: "var(--bg-base)" }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
        <ZoomControls />
      </ReactFlow>
    </div>
  )
}

export function ConceptTree(props) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  )
}
