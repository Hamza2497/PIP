import { useCallback, useEffect, useState } from "react"
import { Background, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ConceptNode } from "./ConceptNode"
import { api } from "../../api"
import { getLayoutedElements } from "../../utils/treeLayout"

const nodeTypes = { concept: ConceptNode }

function TreeInner({ projectId, onNodeClick }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const { panBy } = useReactFlow()

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

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    panBy({ x: 0, y: -e.deltaY * 0.6 })
  }, [panBy])

  return (
    <div style={{ width: "100%", height: "100%" }} onWheel={handleWheel}>
      <ReactFlow
        nodes={nodes.map(n => ({ ...n, selected: n.id === selectedId }))}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          setSelectedId(node.id)
          onNodeClick?.(node)
        }}
        style={{ background: "var(--bg-base)" }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
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
