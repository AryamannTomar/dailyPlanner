"use client"

import { cn } from "@/lib/utils"

export default function ProgressCircle({
  percent = 0,
  size = 48,
  strokeWidth = 8,
  trackColor = "#e5e7eb",
  progressColor = "#10b981",
  className,
}: {
  percent?: number
  size?: number
  strokeWidth?: number
  trackColor?: string
  progressColor?: string
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamp = (n: number) => Math.max(0, Math.min(100, n))
  const pct = clamp(percent)
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[10px] font-semibold tabular-nums">
          {pct}
          {"%"}
        </span>
      </div>
    </div>
  )
}
