import type { TaskPriority } from "@/lib/types"

export type ParsedTask = {
  description: string
  startTime: string | null // "HH:MM" format
  endTime: string | null // "HH:MM" format
  duration: number | null // in minutes
  tags: string[]
  priority: TaskPriority
}

// Convert 12h time to 24h format
function to24h(hours: number, minutes: number, period: "am" | "pm"): string {
  let h = hours
  if (period === "pm" && h !== 12) {
    h += 12
  } else if (period === "am" && h === 12) {
    h = 0
  }
  return `${String(h).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

// Parse time string like "2pm", "2:30pm", "14:00", "9:00"
function parseTime(timeStr: string): string | null {
  timeStr = timeStr.trim().toLowerCase()

  // Match 12h format: "2pm", "2:30pm", "12:00am"
  const match12h = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i)
  if (match12h) {
    const hours = parseInt(match12h[1], 10)
    const minutes = match12h[2] ? parseInt(match12h[2], 10) : 0
    const period = match12h[3].toLowerCase() as "am" | "pm"

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      return null
    }

    return to24h(hours, minutes, period)
  }

  // Match 24h format: "14:00", "9:00", "09:30"
  const match24h = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (match24h) {
    const hours = parseInt(match24h[1], 10)
    const minutes = parseInt(match24h[2], 10)

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  }

  return null
}

// Parse duration string like "30min", "1 hour", "1.5h", "90 minutes"
function parseDuration(durationStr: string): number | null {
  durationStr = durationStr.trim().toLowerCase()

  // Match minutes: "30min", "30 min", "30 minutes", "30m"
  const matchMin = durationStr.match(/^(\d+(?:\.\d+)?)\s*(?:min(?:utes?)?|m)$/i)
  if (matchMin) {
    return Math.round(parseFloat(matchMin[1]))
  }

  // Match hours: "1 hour", "1.5h", "2 hours", "1hr"
  const matchHour = durationStr.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hr?s?)$/i)
  if (matchHour) {
    return Math.round(parseFloat(matchHour[1]) * 60)
  }

  return null
}

// Add minutes to a time string
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number)
  const totalMinutes = h * 60 + m + minutes
  const newH = Math.floor(totalMinutes / 60) % 24
  const newM = totalMinutes % 60
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`
}

export function parseTaskInput(input: string): ParsedTask {
  let description = input
  let startTime: string | null = null
  let endTime: string | null = null
  let duration: number | null = null
  const tags: string[] = []
  let priority: TaskPriority = null

  // Extract priority (!high, !medium, !low)
  const priorityMatch = description.match(/\s*!(high|medium|low)\b/i)
  if (priorityMatch) {
    priority = priorityMatch[1].toLowerCase() as "high" | "medium" | "low"
    description = description.replace(priorityMatch[0], "")
  }

  // Extract tags (#tag1 #tag2)
  const tagMatches = description.matchAll(/#(\w+)/g)
  for (const match of tagMatches) {
    tags.push(match[1])
  }
  description = description.replace(/#\w+/g, "")

  // Extract time range (9:00-10:00, 9am-10am, 9:00am-10:30am)
  const timeRangeMatch = description.match(
    /\b(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b/i
  )
  if (timeRangeMatch) {
    const start = parseTime(timeRangeMatch[1])
    const end = parseTime(timeRangeMatch[2])
    if (start && end) {
      startTime = start
      endTime = end
    }
    description = description.replace(timeRangeMatch[0], "")
  }

  // Extract "at [time]" pattern
  if (!startTime) {
    const atTimeMatch = description.match(/\bat\s+(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)\b/i)
    if (atTimeMatch) {
      const time = parseTime(atTimeMatch[1])
      if (time) {
        startTime = time
      }
      description = description.replace(atTimeMatch[0], "")
    }
  }

  // Extract duration "for [duration]"
  const forDurationMatch = description.match(/\bfor\s+(\d+(?:\.\d+)?\s*(?:min(?:utes?)?|m|hours?|hr?s?))\b/i)
  if (forDurationMatch) {
    const dur = parseDuration(forDurationMatch[1])
    if (dur) {
      duration = dur
    }
    description = description.replace(forDurationMatch[0], "")
  }

  // Calculate end time from start time and duration if we have both
  if (startTime && duration && !endTime) {
    endTime = addMinutesToTime(startTime, duration)
  }

  // If we only have start time, default to 1 hour duration
  if (startTime && !endTime) {
    endTime = addMinutesToTime(startTime, 60)
  }

  // Clean up description
  description = description
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()

  return {
    description,
    startTime,
    endTime,
    duration,
    tags,
    priority,
  }
}

// Get autocomplete suggestions based on current input
export function getAutocompleteSuggestions(input: string): string[] {
  const suggestions: string[] = []
  const lowerInput = input.toLowerCase()

  // Time suggestions
  if (lowerInput.includes("at ") && !lowerInput.match(/at \d/)) {
    suggestions.push("at 9am", "at 10am", "at 2pm", "at 3pm")
  }

  // Duration suggestions
  if (lowerInput.includes("for ") && !lowerInput.match(/for \d/)) {
    suggestions.push("for 30min", "for 1 hour", "for 1.5 hours", "for 2 hours")
  }

  // Priority suggestions
  if (lowerInput.includes("!") && !lowerInput.match(/!(high|medium|low)/i)) {
    suggestions.push("!high", "!medium", "!low")
  }

  // Tag suggestions
  if (lowerInput.includes("#") && !lowerInput.match(/#\w+/)) {
    suggestions.push("#work", "#personal", "#meeting", "#urgent")
  }

  return suggestions
}

// Format time for display (24h to 12h)
export function formatTimeDisplay(time24: string): string {
  const [hStr, mStr] = time24.split(":")
  let h = parseInt(hStr, 10)
  const m = mStr
  const period = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${period}`
}
