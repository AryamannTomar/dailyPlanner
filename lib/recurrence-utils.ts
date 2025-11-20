import type { RecurrencePattern, Task } from '@/lib/types'

/**
 * Generates future dates based on a recurrence pattern
 * @param pattern - The recurrence pattern to use
 * @param startDate - The start date in ISO format (YYYY-MM-DD)
 * @param count - Number of occurrences to generate
 * @returns Array of date strings in ISO format
 */
export function generateRecurringDates(
  pattern: RecurrencePattern,
  startDate: string,
  count: number
): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  let currentDate = new Date(start)
  let generated = 0

  // For weekly with specific days, we need to handle it differently
  if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b)
    let weekStart = new Date(currentDate)

    // Move to the start of the week (Sunday)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    let weekCount = 0

    while (generated < count) {
      for (const dayOfWeek of sortedDays) {
        const targetDate = new Date(weekStart)
        targetDate.setDate(targetDate.getDate() + dayOfWeek)

        // Skip dates before start date
        if (targetDate < start) continue

        // Check end date
        if (pattern.endDate && targetDate > new Date(pattern.endDate)) {
          return dates
        }

        dates.push(formatDateISO(targetDate))
        generated++

        if (generated >= count) break
      }

      // Move to next interval of weeks
      weekCount++
      if (weekCount >= pattern.interval) {
        weekStart.setDate(weekStart.getDate() + 7 * pattern.interval)
        weekCount = 0
      } else {
        weekStart.setDate(weekStart.getDate() + 7)
      }
    }
  } else {
    // Handle daily and monthly, and weekly without specific days
    while (generated < count) {
      // Check end date
      if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
        break
      }

      dates.push(formatDateISO(currentDate))
      generated++

      // Calculate next date
      currentDate = getNextDate(currentDate, pattern)
    }
  }

  return dates
}

/**
 * Gets the next date based on the recurrence pattern
 */
function getNextDate(date: Date, pattern: RecurrencePattern): Date {
  const next = new Date(date)

  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + pattern.interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7 * pattern.interval)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + pattern.interval)
      break
  }

  return next
}

/**
 * Formats a date to ISO format (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Checks if a recurring task should appear on a specific date
 * @param task - The task with recurrence pattern
 * @param date - The date to check in ISO format (YYYY-MM-DD)
 * @param taskDate - The original date of the task in ISO format (YYYY-MM-DD)
 * @returns true if the task should appear on the given date
 */
export function shouldGenerateRecurrence(
  task: Task,
  date: string,
  taskDate: string
): boolean {
  if (!task.recurrence) return false

  const pattern = task.recurrence
  const targetDate = new Date(date)
  const startDate = new Date(taskDate)

  targetDate.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)

  // Target date must be on or after start date
  if (targetDate < startDate) return false

  // Check end date
  if (pattern.endDate && targetDate > new Date(pattern.endDate)) {
    return false
  }

  switch (pattern.frequency) {
    case 'daily': {
      const diffDays = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays % pattern.interval === 0
    }

    case 'weekly': {
      const diffDays = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const diffWeeks = Math.floor(diffDays / 7)

      // Check if we're on the right week interval
      if (diffWeeks % pattern.interval !== 0) return false

      // If specific days are set, check if target day matches
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        return pattern.daysOfWeek.includes(targetDate.getDay())
      }

      // Otherwise, same day of the week as start
      return targetDate.getDay() === startDate.getDay()
    }

    case 'monthly': {
      // Check if same day of month
      if (targetDate.getDate() !== startDate.getDate()) {
        // Handle end of month cases (e.g., 31st -> 28th for Feb)
        const lastDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate()
        if (startDate.getDate() > lastDayOfMonth && targetDate.getDate() === lastDayOfMonth) {
          // This is acceptable for end-of-month handling
        } else {
          return false
        }
      }

      // Check month interval
      const monthsDiff =
        (targetDate.getFullYear() - startDate.getFullYear()) * 12 +
        (targetDate.getMonth() - startDate.getMonth())

      return monthsDiff >= 0 && monthsDiff % pattern.interval === 0
    }

    default:
      return false
  }
}

/**
 * Formats a recurrence pattern as a human-readable string
 * @param pattern - The recurrence pattern
 * @returns Human-readable description
 */
export function formatRecurrencePattern(pattern: RecurrencePattern): string {
  const { frequency, interval, daysOfWeek, endDate } = pattern

  let text = ''

  if (frequency === 'daily') {
    text = interval === 1 ? 'Daily' : `Every ${interval} days`
  } else if (frequency === 'weekly') {
    if (daysOfWeek && daysOfWeek.length > 0) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const days = daysOfWeek.map(d => dayNames[d]).join(', ')
      text = interval === 1
        ? `Weekly on ${days}`
        : `Every ${interval} weeks on ${days}`
    } else {
      text = interval === 1 ? 'Weekly' : `Every ${interval} weeks`
    }
  } else if (frequency === 'monthly') {
    text = interval === 1 ? 'Monthly' : `Every ${interval} months`
  }

  if (endDate) {
    const end = new Date(endDate)
    text += ` until ${end.toLocaleDateString()}`
  }

  return text
}

/**
 * Gets the day name abbreviation
 */
export function getDayName(dayIndex: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[dayIndex] || ''
}

/**
 * Gets the full day name
 */
export function getFullDayName(dayIndex: number): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return names[dayIndex] || ''
}
