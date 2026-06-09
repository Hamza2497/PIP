/**
 * Takes a flat array of concepts (each with id and prereqs:[id,...])
 * and returns the same array with cx, cy positions added.
 *
 * Strategy: topological sort → assign level → spread nodes
 * evenly across each level horizontally.
 */
export function layoutTree(concepts, canvasWidth = 680, levelHeight = 150) {
  if (!concepts.length) return []

  const byId = Object.fromEntries(concepts.map(c => [c.id, c]))
  const children = Object.fromEntries(concepts.map(c => [c.id, []]))
  concepts.forEach(c => {
    ;(c.prereqs || []).forEach(pid => {
      if (children[pid]) children[pid].push(c.id)
    })
  })

  // BFS from roots to assign levels (max depth wins for multi-path nodes)
  const level = {}
  const roots = concepts.filter(c => !c.prereqs || c.prereqs.length === 0)
  if (roots.length === 0) roots.push(concepts[0])
  const queue = roots.map(r => ({ id: r.id, lv: 0 }))
  while (queue.length) {
    const { id, lv } = queue.shift()
    if (level[id] !== undefined && level[id] >= lv) continue
    level[id] = lv
    children[id].forEach(cid => queue.push({ id: cid, lv: lv + 1 }))
  }

  const maxLevel = Math.max(...Object.values(level))
  const byLevel = Array.from({ length: maxLevel + 1 }, () => [])
  concepts.forEach(c => {
    const lv = level[c.id] ?? maxLevel
    byLevel[lv].push(c.id)
  })

  const padding = 60
  const result = []
  byLevel.forEach((ids, lv) => {
    const y = 80 + lv * levelHeight
    ids.forEach((id, i) => {
      const span = canvasWidth - padding * 2
      const x = ids.length === 1
        ? canvasWidth / 2
        : padding + (span / (ids.length - 1)) * i
      result.push({ ...byId[id], cx: x, cy: y })
    })
  })
  return result
}

export const TREE_H_PER_LEVEL = 150
