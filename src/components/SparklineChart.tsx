'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface Props {
  data: number[]
  height?: number
  showLabels?: boolean
}

export default function SparklineChart({ data, height = 48, showLabels = false }: Props) {
  if (data.length < 2) return null

  const id = useId()
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [svgWidth, setSvgWidth] = useState(300)

  useEffect(() => {
    if (!svgRef.current) return
    const obs = new ResizeObserver(entries => {
      setSvgWidth(entries[0].contentRect.width)
    })
    obs.observe(svgRef.current)
    return () => obs.disconnect()
  }, [])

  const W = 200

  // Compute grid lines bracketing the data range at multiples of 25
  const min = Math.min(...data)
  const max = Math.max(...data)
  const gridMin = Math.floor(min / 25) * 25
  const gridMax = Math.max(gridMin + 25, Math.ceil(max / 25) * 25)
  const gridLines: number[] = []
  for (let v = gridMin; v <= gridMax; v += 25) gridLines.push(v)
  const range = gridMax - gridMin

  const toX = (i: number) => (i / (data.length - 1)) * W
  const toY = (v: number) => height - ((v - gridMin) / range) * height
  // For y-axis label positioning (% of label gutter div)
  const yPct = (v: number) => ((gridMax - v) / range) * 100

  const start = data[0]
  const end = data[data.length - 1]
  const delta = end - start
  const color = delta > 1 ? '#4ade80' : delta < -1 ? '#f87171' : 'var(--color-accent)'
  const deltaColor = delta > 1 ? 'text-green-400' : delta < -1 ? 'text-red-400' : 'text-zinc-500'

  const linePoints = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  const fillPath = [
    `M ${toX(0)},${toY(data[0])}`,
    ...data.map((v, i) => `L ${toX(i)},${toY(v)}`),
    `L ${toX(data.length - 1)},${height}`,
    `L ${toX(0)},${height} Z`,
  ].join(' ')

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const idx = Math.max(0, Math.min(data.length - 1,
      Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1))
    ))
    setHoverIdx(idx)
  }

  const hoverValue = hoverIdx !== null ? data[hoverIdx] : null

  // Dot radius corrected for non-uniform SVG scaling so it renders as a circle
  const xScale = svgWidth / W
  const dotR = 4  // desired visual radius in px
  const dotRx = dotR / xScale  // SVG-space rx (compensates for x stretch)
  const dotRy = dotR           // SVG-space ry (y scale is 1:1 since height matches)

  return (
    <div>
      {/* Text row above chart */}
      <div className="flex justify-between items-baseline mb-2 text-xs">
        {showLabels ? (
          hoverValue !== null
            ? <span className="text-zinc-400">YES <span style={{ color }}>{hoverValue}%</span></span>
            : <span className="text-zinc-600">{start}% → {end}% <span className={deltaColor}>({delta > 0 ? '+' : ''}{delta}%)</span></span>
        ) : (
          <>
            <span className="text-zinc-600">{start}% → {end}%</span>
            <span className={deltaColor}>{delta > 0 ? '+' : ''}{delta}%</span>
          </>
        )}
      </div>

      <div className="flex">
        {/* Y-axis labels in left gutter */}
        {showLabels && (
          <div className="relative" style={{ width: 32, flexShrink: 0, height }}>
            {gridLines.map(v => {
              const pct = yPct(v)
              // Avoid overflow: pin top label to top edge, bottom label to bottom edge
              const style = pct <= 0
                ? { top: 0 }
                : pct >= 100
                ? { bottom: 0 }
                : { top: `${pct}%`, transform: 'translateY(-50%)' }
              return (
                <span
                  key={v}
                  className="absolute right-1 text-right text-xs text-zinc-500 pointer-events-none"
                  style={style}
                >
                  {v}%
                </span>
              )
            })}
          </div>
        )}

        {/* SVG — crosshair and dot live inside so positions always match */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className="flex-1"
          style={{ height, display: 'block' }}
          onMouseMove={showLabels ? handleMouseMove : undefined}
          onMouseLeave={showLabels ? () => setHoverIdx(null) : undefined}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {(showLabels ? gridLines : [gridLines[Math.floor(gridLines.length / 2)]]).map(v => (
            <line key={v} x1="0" y1={toY(v)} x2={W} y2={toY(v)}
              stroke="#3f3f46" strokeWidth="1" strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke" />
          ))}

          <path d={fillPath} fill={`url(#${id})`} />
          <polyline points={linePoints} fill="none" stroke={color}
            strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
            vectorEffect="non-scaling-stroke" />

          {showLabels && hoverIdx !== null && (
            <>
              <line
                x1={toX(hoverIdx)} y1={0} x2={toX(hoverIdx)} y2={height}
                stroke="#71717a" strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <ellipse
                cx={toX(hoverIdx)} cy={toY(data[hoverIdx])}
                rx={dotRx} ry={dotRy}
                fill={color} stroke="#18181b" strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
