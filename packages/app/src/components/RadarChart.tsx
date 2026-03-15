// Hexagonal radar chart — pointed-top, no external deps
// Axes order (clockwise from top): Personnel, Supply, Infra, Comms, Coordination, Cohesion

interface RadarChartProps {
  scores: [number, number, number, number, number, number] // 0–100 each
}

const LABELS = ['People', 'Supply', 'Infra', 'Comms', 'Coord', 'Cohesion']

// Pointed-top hexagon: axis 0 at -90°, then +60° each step
function axisPoint(index: number, radius: number, cx: number, cy: number): [number, number] {
  const angle = (Math.PI / 180) * (-90 + index * 60)
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
}

export default function RadarChart({ scores }: RadarChartProps) {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const maxRadius = 72
  const labelRadius = maxRadius + 16

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0]

  function ringPath(frac: number): string {
    const pts = Array.from({ length: 6 }, (_, i) => axisPoint(i, maxRadius * frac, cx, cy))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z'
  }

  function scorePath(): string {
    const pts = scores.map((s, i) => axisPoint(i, maxRadius * Math.max(0, Math.min(100, s)) / 100, cx, cy))
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ') + ' Z'
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-label="Readiness radar chart">
      {/* Grid rings */}
      {rings.map(frac => (
        <path
          key={frac}
          d={ringPath(frac)}
          fill="none"
          stroke="#2d4a2d"
          strokeWidth={frac === 1.0 ? 1.2 : 0.8}
          opacity={0.6}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 6 }, (_, i) => {
        const [x, y] = axisPoint(i, maxRadius, cx, cy)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(2)}
            y2={y.toFixed(2)}
            stroke="#2d4a2d"
            strokeWidth={0.8}
            opacity={0.7}
          />
        )
      })}

      {/* Score polygon */}
      <path
        d={scorePath()}
        fill="rgba(74,222,128,0.18)"
        stroke="#4ade80"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="#4ade80" opacity={0.7} />

      {/* Labels */}
      {LABELS.map((label, i) => {
        const [x, y] = axisPoint(i, labelRadius, cx, cy)
        // Adjust text anchor based on horizontal position
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
        // Slight vertical offset for top/bottom
        const dy = i === 0 ? -2 : i === 3 ? 4 : 0
        return (
          <text
            key={i}
            x={x.toFixed(2)}
            y={(y + dy).toFixed(2)}
            textAnchor={anchor}
            fontSize={9}
            fill="#9ca3af"
            dominantBaseline="middle"
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        )
      })}

      {/* Score dots */}
      {scores.map((s, i) => {
        const [x, y] = axisPoint(i, maxRadius * Math.max(0, Math.min(100, s)) / 100, cx, cy)
        return (
          <circle
            key={i}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r={3}
            fill="#4ade80"
            stroke="#1a2e1a"
            strokeWidth={1}
          />
        )
      })}
    </svg>
  )
}
