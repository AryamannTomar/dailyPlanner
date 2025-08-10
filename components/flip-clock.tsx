"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

type UnitKey = "hours" | "minutes" | "seconds"

interface FlipDigitProps {
  digit: string
  previous: string
  play: boolean
}

function FlipDigit({ digit, previous, play }: FlipDigitProps) {
  return (
    <div 
      className="relative overflow-hidden rounded-sm bg-card border shadow-sm"
      style={{ 
        width: 'calc(16px * var(--flip-scale, 1))',
        height: 'calc(24px * var(--flip-scale, 1))',
        perspective: '600px'
      }}
      aria-hidden="true"
    >
      <div className="relative w-full h-full">
        {/* Single face: the only visible row at rest */}
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center font-mono font-bold text-foreground",
            play && "invisible"
          )}
          style={{
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 'calc(12px * var(--flip-scale, 1))',
            lineHeight: '1'
          }}
        >
          {digit}
        </div>

        {/* Overlays appear only while flipping */}
        <div 
          className={cn(
            "absolute left-0 w-full h-1/2 flex items-center justify-center font-mono font-bold text-foreground overflow-hidden pointer-events-none z-[2]",
            play ? "visible" : "invisible"
          )}
          style={{
            top: '0',
            transformOrigin: 'center bottom',
            background: 'linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--card)) 60%, hsl(var(--muted)) 100%)',
            borderBottom: '1px solid hsl(var(--border))',
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 'calc(12px * var(--flip-scale, 1))',
            lineHeight: '1',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            animation: play ? `flip-top calc(var(--flip-duration, 500ms) / 2) ease-in forwards` : 'none'
          }}
        >
          <div style={{ transform: 'translateZ(0)' }}>{previous}</div>
        </div>
        
        <div 
          className={cn(
            "absolute left-0 w-full h-1/2 flex items-center justify-center font-mono font-bold text-foreground overflow-hidden pointer-events-none z-[2]",
            play ? "visible" : "invisible"
          )}
          style={{
            bottom: '0',
            transformOrigin: 'center top',
            background: 'linear-gradient(to bottom, hsl(var(--muted)) 0%, hsl(var(--card)) 100%)',
            borderTop: '1px solid hsl(var(--border))',
            fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 'calc(12px * var(--flip-scale, 1))',
            lineHeight: '1',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            animation: play ? `flip-bottom calc(var(--flip-duration, 500ms) / 2) ease-out forwards` : 'none',
            animationDelay: play ? 'calc(var(--flip-duration, 500ms) / 2)' : '0ms'
          }}
        >
          <div style={{ transform: 'translateZ(0)' }}>{digit}</div>
        </div>
      </div>
      
      {/* Subtle seam for realism */}
      <div 
        className="absolute left-0 top-1/2 w-full h-0.5 pointer-events-none"
        style={{
          transform: 'translateY(-1px)',
          background: 'linear-gradient(to bottom, hsla(var(--foreground), 0.05), hsla(var(--foreground), 0))'
        }}
      />
    </div>
  )
}

export interface FlipClockProps {
  className?: string
  durationMs?: number // Total flip duration (default 500ms)
  scale?: number // Size multiplier (default 1)
}

/**
 * Single-row flip-style digital clock (hh:mm:ss AM/PM)
 * - Starts after mount, aligned to real seconds
 * - Flips only the units that change
 * - Encapsulated styles; adapts to shadcn light/dark tokens
 */
export default function FlipClock({ className, durationMs = 500, scale = 1 }: FlipClockProps) {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState(new Date())
  const prevRef = useRef(new Date())
  const [play, setPlay] = useState<{ hours: boolean; minutes: boolean; seconds: boolean }>({
    hours: false,
    minutes: false,
    seconds: false,
  })
  const firstTick = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
    const now = new Date()
    setTime(now)
    prevRef.current = now

    const msToNextSecond = 1000 - now.getMilliseconds()
    timeoutRef.current = setTimeout(() => {
      tick() // first aligned tick
      intervalRef.current = setInterval(tick, 1000)
    }, msToNextSecond)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fmt(date: Date) {
    const h24 = date.getHours()
    const h12 = h24 % 12 || 12
    return {
      hours: h12.toString().padStart(2, "0"),
      minutes: date.getMinutes().toString().padStart(2, "0"),
      seconds: date.getSeconds().toString().padStart(2, "0"),
      ampm: h24 >= 12 ? "PM" : "AM",
    }
  }

  function tick() {
    const prev = prevRef.current
    const next = new Date()
    setTime(next)

    const a = fmt(prev)
    const b = fmt(next)

    if (firstTick.current) {
      // Do not animate on first aligned update
      firstTick.current = false
      prevRef.current = next
      setPlay({ hours: false, minutes: false, seconds: false })
      return
    }

    const flips = {
      hours: a.hours !== b.hours,
      minutes: a.minutes !== b.minutes,
      seconds: a.seconds !== b.seconds,
    }

    setPlay(flips)
    prevRef.current = next

    // Stop flip after duration
    setTimeout(() => setPlay({ hours: false, minutes: false, seconds: false }), durationMs)
  }

  if (!mounted) {
    // Simple skeleton for SSR/first paint
    return (
      <div className={cn("inline-flex items-center gap-1 rounded-md border bg-card/50 px-2 py-1 shadow-sm", className)}>
        <div className="h-6 w-4 rounded-sm bg-muted animate-pulse" />
        <span className="text-xs text-muted-foreground font-mono">:</span>
        <div className="h-6 w-4 rounded-sm bg-muted animate-pulse" />
        <span className="text-xs text-muted-foreground font-mono">:</span>
        <div className="h-6 w-4 rounded-sm bg-muted animate-pulse" />
        <span className="ml-1 text-xs text-muted-foreground font-mono">AM</span>
      </div>
    )
  }

  const cur = fmt(time)
  const prev = fmt(prevRef.current)

  const styleVars: CSSProperties = {
    ["--flip-duration" as any]: `${durationMs}ms`,
    ["--flip-scale" as any]: scale,
  }

  return (
    <div
      className={cn(
        "inline-flex select-none items-center gap-1 rounded-md border bg-card/50 px-2 py-1 shadow-sm",
        className,
      )}
      style={styleVars}
      aria-live="polite"
      aria-label={`Current time ${cur.hours}:${cur.minutes}:${cur.seconds} ${cur.ampm}`}
    >
      {/* CSS animations */}
      <style jsx>{`
        @keyframes flip-top {
          0% {
            transform: rotateX(0deg);
            filter: brightness(1);
          }
          100% {
            transform: rotateX(-90deg);
            filter: brightness(0.9);
          }
        }
        
        @keyframes flip-bottom {
          0% {
            transform: rotateX(90deg);
            filter: brightness(0.9);
          }
          100% {
            transform: rotateX(0deg);
            filter: brightness(1);
          }
        }
      `}</style>
      
      {/* Hours */}
      <div className="flex gap-0.5">
        <FlipDigit digit={cur.hours[0]} previous={prev.hours[0]} play={play.hours} />
        <FlipDigit digit={cur.hours[1]} previous={prev.hours[1]} play={play.hours} />
      </div>

      <span className="font-mono text-xs text-muted-foreground">:</span>

      {/* Minutes */}
      <div className="flex gap-0.5">
        <FlipDigit digit={cur.minutes[0]} previous={prev.minutes[0]} play={play.minutes} />
        <FlipDigit digit={cur.minutes[1]} previous={prev.minutes[1]} play={play.minutes} />
      </div>

      <span className="font-mono text-xs text-muted-foreground">:</span>

      {/* Seconds */}
      <div className="flex gap-0.5">
        <FlipDigit digit={cur.seconds[0]} previous={prev.seconds[0]} play={play.seconds} />
        <FlipDigit digit={cur.seconds[1]} previous={prev.seconds[1]} play={play.seconds} />
      </div>

      <span className="ml-1 font-mono text-xs text-foreground">{cur.ampm}</span>
    </div>
  )
}
