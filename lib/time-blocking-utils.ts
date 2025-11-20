import type { Task } from "@/lib/types"
import { parseTimeToSeconds } from "@/lib/time-utils"

// Time blocking constants
export const TIMELINE_START_HOUR = 6 // 6 AM
export const TIMELINE_END_HOUR = 22 // 10 PM
export const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR // 16 hours
export const PIXELS_PER_HOUR = 60 // Height per hour in pixels
export const TIMELINE_HEIGHT = TIMELINE_HOURS * PIXELS_PER_HOUR // Total timeline height

// Calculate the top position and height for a task block
export function calculateBlockPosition(
  startTime: string,
  endTime: string
): { top: number; height: number } {
  const startSeconds = parseTimeToSeconds(startTime)
  const endSeconds = parseTimeToSeconds(endTime)

  const timelineStartSeconds = TIMELINE_START_HOUR * 3600
  const timelineEndSeconds = TIMELINE_END_HOUR * 3600

  // Clamp start and end to timeline bounds
  const clampedStart = Math.max(startSeconds, timelineStartSeconds)
  const clampedEnd = Math.min(endSeconds, timelineEndSeconds)

  // Calculate position relative to timeline start
  const startOffset = (clampedStart - timelineStartSeconds) / 3600
  const endOffset = (clampedEnd - timelineStartSeconds) / 3600

  const top = startOffset * PIXELS_PER_HOUR
  const height = Math.max((endOffset - startOffset) * PIXELS_PER_HOUR, 20) // Minimum height of 20px

  return { top, height }
}

// Convert pixel position to time string
export function pixelToTime(pixelY: number): string {
  const hours = TIMELINE_START_HOUR + (pixelY / PIXELS_PER_HOUR)
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)

  // Clamp to valid time
  const clampedH = Math.max(TIMELINE_START_HOUR, Math.min(TIMELINE_END_HOUR, h))
  const clampedM = Math.max(0, Math.min(59, m))

  return `${String(clampedH).padStart(2, "0")}:${String(clampedM).padStart(2, "0")}`
}

// Snap time to nearest interval (e.g., 15 minutes)
export function snapToInterval(time: string, intervalMinutes: number = 15): string {
  const seconds = parseTimeToSeconds(time)
  const intervalSeconds = intervalMinutes * 60
  const snappedSeconds = Math.round(seconds / intervalSeconds) * intervalSeconds

  const h = Math.floor(snappedSeconds / 3600)
  const m = Math.floor((snappedSeconds % 3600) / 60)

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Detect overlapping tasks
export type OverlapInfo = {
  taskId: string
  overlappingWith: string[]
}

export function detectOverlaps(tasks: Task[]): OverlapInfo[] {
  const overlaps: OverlapInfo[] = []

  for (let i = 0; i < tasks.length; i++) {
    const taskA = tasks[i]
    const aStart = parseTimeToSeconds(taskA.startTime)
    const aEnd = parseTimeToSeconds(taskA.approxEndTime)
    const overlappingWith: string[] = []

    for (let j = 0; j < tasks.length; j++) {
      if (i === j) continue

      const taskB = tasks[j]
      const bStart = parseTimeToSeconds(taskB.startTime)
      const bEnd = parseTimeToSeconds(taskB.approxEndTime)

      // Check for overlap: A starts before B ends AND A ends after B starts
      if (aStart < bEnd && aEnd > bStart) {
        overlappingWith.push(taskB.id)
      }
    }

    if (overlappingWith.length > 0) {
      overlaps.push({
        taskId: taskA.id,
        overlappingWith
      })
    }
  }

  return overlaps
}

// Time slot suggestion
export type TimeSlot = {
  startTime: string
  endTime: string
  durationMinutes: number
}

// Find available time slots for a given duration
export function suggestTimeSlots(
  tasks: Task[],
  durationMinutes: number,
  minGapMinutes: number = 0
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const durationSeconds = durationMinutes * 60
  const minGapSeconds = minGapMinutes * 60

  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) =>
    parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime)
  )

  const timelineStart = TIMELINE_START_HOUR * 3600
  const timelineEnd = TIMELINE_END_HOUR * 3600

  // Check slot before first task
  if (sortedTasks.length === 0) {
    // Entire timeline is available
    if (timelineEnd - timelineStart >= durationSeconds) {
      slots.push({
        startTime: formatSecondsToTime(timelineStart),
        endTime: formatSecondsToTime(timelineStart + durationSeconds),
        durationMinutes: (timelineEnd - timelineStart) / 60
      })
    }
    return slots
  }

  // Check gap before first task
  const firstTaskStart = parseTimeToSeconds(sortedTasks[0].startTime)
  if (firstTaskStart - timelineStart >= durationSeconds + minGapSeconds) {
    slots.push({
      startTime: formatSecondsToTime(timelineStart),
      endTime: formatSecondsToTime(timelineStart + durationSeconds),
      durationMinutes: (firstTaskStart - timelineStart) / 60
    })
  }

  // Check gaps between tasks
  for (let i = 0; i < sortedTasks.length - 1; i++) {
    const currentEnd = parseTimeToSeconds(sortedTasks[i].approxEndTime)
    const nextStart = parseTimeToSeconds(sortedTasks[i + 1].startTime)
    const gapDuration = nextStart - currentEnd

    if (gapDuration >= durationSeconds + minGapSeconds * 2) {
      slots.push({
        startTime: formatSecondsToTime(currentEnd + minGapSeconds),
        endTime: formatSecondsToTime(currentEnd + minGapSeconds + durationSeconds),
        durationMinutes: gapDuration / 60
      })
    }
  }

  // Check gap after last task
  const lastTaskEnd = parseTimeToSeconds(sortedTasks[sortedTasks.length - 1].approxEndTime)
  if (timelineEnd - lastTaskEnd >= durationSeconds + minGapSeconds) {
    slots.push({
      startTime: formatSecondsToTime(lastTaskEnd + minGapSeconds),
      endTime: formatSecondsToTime(lastTaskEnd + minGapSeconds + durationSeconds),
      durationMinutes: (timelineEnd - lastTaskEnd) / 60
    })
  }

  return slots
}

// Get all gaps in the timeline
export function getTimelineGaps(tasks: Task[]): TimeSlot[] {
  const gaps: TimeSlot[] = []

  if (tasks.length === 0) {
    return [{
      startTime: formatSecondsToTime(TIMELINE_START_HOUR * 3600),
      endTime: formatSecondsToTime(TIMELINE_END_HOUR * 3600),
      durationMinutes: TIMELINE_HOURS * 60
    }]
  }

  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) =>
    parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime)
  )

  const timelineStart = TIMELINE_START_HOUR * 3600
  const timelineEnd = TIMELINE_END_HOUR * 3600

  // Check gap before first task
  const firstTaskStart = parseTimeToSeconds(sortedTasks[0].startTime)
  if (firstTaskStart > timelineStart) {
    gaps.push({
      startTime: formatSecondsToTime(timelineStart),
      endTime: formatSecondsToTime(firstTaskStart),
      durationMinutes: (firstTaskStart - timelineStart) / 60
    })
  }

  // Check gaps between tasks
  for (let i = 0; i < sortedTasks.length - 1; i++) {
    const currentEnd = parseTimeToSeconds(sortedTasks[i].approxEndTime)
    const nextStart = parseTimeToSeconds(sortedTasks[i + 1].startTime)

    if (nextStart > currentEnd) {
      gaps.push({
        startTime: formatSecondsToTime(currentEnd),
        endTime: formatSecondsToTime(nextStart),
        durationMinutes: (nextStart - currentEnd) / 60
      })
    }
  }

  // Check gap after last task
  const lastTaskEnd = parseTimeToSeconds(sortedTasks[sortedTasks.length - 1].approxEndTime)
  if (lastTaskEnd < timelineEnd) {
    gaps.push({
      startTime: formatSecondsToTime(lastTaskEnd),
      endTime: formatSecondsToTime(timelineEnd),
      durationMinutes: (timelineEnd - lastTaskEnd) / 60
    })
  }

  return gaps
}

// Suggest break times based on work patterns
export function suggestBreakTimes(
  tasks: Task[],
  breakDurationMinutes: number = 15,
  workBlockMinutes: number = 90
): TimeSlot[] {
  const breaks: TimeSlot[] = []
  const breakDuration = breakDurationMinutes * 60
  const workBlock = workBlockMinutes * 60

  // Sort tasks by start time
  const sortedTasks = [...tasks].sort((a, b) =>
    parseTimeToSeconds(a.startTime) - parseTimeToSeconds(b.startTime)
  )

  if (sortedTasks.length === 0) return breaks

  let consecutiveWorkTime = 0
  let lastBreakEnd = TIMELINE_START_HOUR * 3600

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i]
    const taskStart = parseTimeToSeconds(task.startTime)
    const taskEnd = parseTimeToSeconds(task.approxEndTime)
    const taskDuration = taskEnd - taskStart

    // Check if there's a gap that could be a break
    if (taskStart > lastBreakEnd) {
      const gapDuration = taskStart - lastBreakEnd
      if (gapDuration >= breakDuration) {
        // This gap already serves as a break
        consecutiveWorkTime = 0
        lastBreakEnd = taskStart
      }
    }

    consecutiveWorkTime += taskDuration

    // Suggest a break after this task if work time exceeds threshold
    if (consecutiveWorkTime >= workBlock) {
      // Look for next task
      const nextTask = sortedTasks[i + 1]
      const suggestedStart = taskEnd
      const suggestedEnd = taskEnd + breakDuration

      // Only suggest if there's room before next task
      if (!nextTask || parseTimeToSeconds(nextTask.startTime) >= suggestedEnd) {
        breaks.push({
          startTime: formatSecondsToTime(suggestedStart),
          endTime: formatSecondsToTime(suggestedEnd),
          durationMinutes: breakDurationMinutes
        })
        consecutiveWorkTime = 0
        lastBreakEnd = suggestedEnd
      }
    }
  }

  return breaks
}

// Helper function to format seconds to time string
function formatSecondsToTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600) % 24
  const m = Math.floor((totalSeconds % 3600) / 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// Get priority color class
export function getPriorityColor(priority: "high" | "medium" | "low" | null | undefined): string {
  switch (priority) {
    case "high":
      return "bg-red-500"
    case "medium":
      return "bg-yellow-500"
    case "low":
      return "bg-blue-500"
    default:
      return "bg-emerald-500"
  }
}

// Get priority border color for blocks
export function getPriorityBorderColor(priority: "high" | "medium" | "low" | null | undefined): string {
  switch (priority) {
    case "high":
      return "border-l-red-500"
    case "medium":
      return "border-l-yellow-500"
    case "low":
      return "border-l-blue-500"
    default:
      return "border-l-emerald-500"
  }
}

// Get priority background color (lighter) for blocks
export function getPriorityBgColor(priority: "high" | "medium" | "low" | null | undefined): string {
  switch (priority) {
    case "high":
      return "bg-red-50 dark:bg-red-950/30"
    case "medium":
      return "bg-yellow-50 dark:bg-yellow-950/30"
    case "low":
      return "bg-blue-50 dark:bg-blue-950/30"
    default:
      return "bg-emerald-50 dark:bg-emerald-950/30"
  }
}

// Calculate if current time is within timeline
export function isCurrentTimeInTimeline(): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  return currentHour >= TIMELINE_START_HOUR && currentHour < TIMELINE_END_HOUR
}

// Get current time position in pixels
export function getCurrentTimePosition(): number {
  const now = new Date()
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
  const timelineStartSeconds = TIMELINE_START_HOUR * 3600
  const offsetSeconds = currentSeconds - timelineStartSeconds
  return (offsetSeconds / 3600) * PIXELS_PER_HOUR
}

// Calculate new end time based on height resize
export function calculateEndTimeFromHeight(
  startTime: string,
  newHeight: number
): string {
  const startSeconds = parseTimeToSeconds(startTime)
  const durationSeconds = (newHeight / PIXELS_PER_HOUR) * 3600
  const endSeconds = startSeconds + durationSeconds

  const h = Math.floor(endSeconds / 3600) % 24
  const m = Math.floor((endSeconds % 3600) / 60)

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}
