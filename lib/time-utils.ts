export function parseTimeToSeconds(time: string): number {
  if (!time) return 0
  const [hStr = "0", mStr = "0", sStr = "0"] = time.split(":")
  const h = Math.max(0, Math.min(23, Number.parseInt(hStr || "0", 10)))
  const m = Math.max(0, Math.min(59, Number.parseInt(mStr || "0", 10)))
  const s = Math.max(0, Math.min(59, Number.parseInt(sStr || "0", 10)))
  return h * 3600 + m * 60 + s
}

export function secondsToHMS(totalSeconds: number): { h: number; m: number; s: number } {
  const h = Math.floor(totalSeconds / 3600)
  const rem = totalSeconds % 3600
  const m = Math.floor(rem / 60)
  const s = rem % 60
  return { h, m, s }
}

export function formatDurationHuman(totalSeconds: number): string {
  const { h, m, s } = secondsToHMS(Math.max(0, totalSeconds))
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(" ")
}

export function computeDurationSeconds(startTime: string, endTime: string): number {
  const start = parseTimeToSeconds(startTime)
  const end = parseTimeToSeconds(endTime)
  let diff = end - start
  if (diff < 0) diff += 24 * 3600 // overnight safety
  return diff
}

// Delta vs approx (end - approx). Positive => late, Negative => early.
// For same-day tasks, if actual end is before approx end, it means finished early (negative delta)
export function computeDeltaFromApprox(approxEnd: string, actualEnd: string): number {
  const approx = parseTimeToSeconds(approxEnd)
  const end = parseTimeToSeconds(actualEnd)
  let delta = end - approx
  
  // Handle overnight cases where actual end time is before approx end time
  // Only add 24 hours if the difference is significant (more than 12 hours)
  // This indicates the task actually went into the next day
  if (delta < -12 * 3600) {
    delta += 24 * 3600
  }
  
  return delta
}

export function nowHMS(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const ss = String(d.getSeconds()).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

// "HH:MM" or "HH:MM:SS" -> "h:mm AM/PM"
export function formatTime12h(time: string): string {
  if (!time) return ""
  const [hStr = "0", mStr = "0"] = time.split(":")
  const h24 = Math.max(0, Math.min(23, Number.parseInt(hStr || "0", 10)))
  const m = Math.max(0, Math.min(59, Number.parseInt(mStr || "0", 10)))
  const period = h24 >= 12 ? "PM" : "AM"
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

// Helper function to get completion status with icon and color
export function getCompletionStatus(approxEnd: string, actualEnd: string) {
  if (!actualEnd) return { status: 'pending', icon: null, color: 'text-muted-foreground' }
  
  const delta = computeDeltaFromApprox(approxEnd, actualEnd)
  
  if (delta > 0) {
    // Late
    return { 
      status: 'late', 
      icon: '▲', 
      color: 'text-orange-600 dark:text-orange-400',
      delta: Math.abs(delta)
    }
  } else if (delta < 0) {
    // Early
    return { 
      status: 'early', 
      icon: '▼', 
      color: 'text-green-600 dark:text-green-400',
      delta: Math.abs(delta)
    }
  } else {
    // On time
    return { 
      status: 'on-time', 
      icon: '●', 
      color: 'text-blue-600 dark:text-blue-400',
      delta: 0
    }
  }
}
