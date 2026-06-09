import * as dagre from "dagre"

export function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 80 })

  nodes.forEach(n => g.setNode(n.id, { width: 60, height: 60 }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return {
    nodes: nodes.map(n => {
      const pos = g.node(n.id)
      return { ...n, position: { x: pos.x - 30, y: pos.y - 30 } }
    }),
    edges,
  }
}
