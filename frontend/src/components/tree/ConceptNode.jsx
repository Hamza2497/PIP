import { Handle, Position } from "@xyflow/react"

const STATE_COLORS = {
  mastered:    "#22c55e",
  in_progress: "#f59e0b",
  active:      "#38bdf8",
  ready:       "#52525b",
  locked:      "#ef4444",
}

function StateIcon({ cx, cy, state, confidence, color }) {
  if (state === "mastered") {
    return (
      <polyline
        points={`${cx - 7},${cy} ${cx - 2},${cy + 5} ${cx + 7},${cy - 5}`}
        fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
      />
    )
  }
  if (state === "locked") {
    return (
      <>
        <rect x={cx - 5} y={cy - 1} width={10} height={7} rx={1.5} fill="white" fillOpacity={0.85} />
        <path d={`M ${cx - 3.5},${cy - 1} a 3.5,3.5 0 0,1 7,0`} fill="none" stroke="white" strokeWidth={2} />
      </>
    )
  }
  if (state === "in_progress") {
    return (
      <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize={11} fontWeight="600" fill={color}>
        {confidence ?? "?"}
      </text>
    )
  }
  if (state === "ready") {
    return <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} stroke="white" strokeWidth={2} strokeOpacity={0.7} />
  }
  if (state === "active") {
    return <circle cx={cx} cy={cy} r={4} fill={color} className="pulse-dot" />
  }
  return null
}

export function ConceptNode({ data, selected }) {
  const R = 22
  const SIZE = (R + 8) * 2
  const color = STATE_COLORS[data.state] || STATE_COLORS.ready

  return (
    <div style={{ width: SIZE, height: SIZE, position: "relative" }} title={data.label}>
      <svg width={SIZE} height={SIZE}>
        {selected && (
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R + 6}
            fill="none" stroke={color} strokeWidth={1.5} opacity={0.3}
          />
        )}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill={color} fillOpacity={0.13}
        />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none" stroke={color} strokeWidth={2}
          strokeOpacity={selected ? 1 : data.state === "active" ? 0.95 : 0.75}
          className={data.state === "active" ? "pulse-ring" : ""}
        />
        <StateIcon
          cx={SIZE / 2} cy={SIZE / 2}
          state={data.state}
          confidence={data.confidence}
          color={color}
        />
      </svg>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
