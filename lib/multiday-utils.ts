import type { Task } from '@/lib/types'

/**
 * Parses an ISO date string to a Date object
 */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Formats a Date to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns all days a task spans as an array of ISO date strings
 * @param task - The task to check
 * @param taskStartDate - The start date of the task (ISO string)
 * @returns Array of ISO date strings the task spans
 */
export function getTaskDays(task: Task, taskStartDate: string): string[] {
  const days: string[] = [taskStartDate]

  if (!task.endDate || task.endDate <= taskStartDate) {
    return days
  }

  const startDate = parseDate(taskStartDate)
  const endDate = parseDate(task.endDate)

  let current = new Date(startDate)
  current.setDate(current.getDate() + 1)

  while (current <= endDate) {
    days.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return days
}

/**
 * Returns the progress of a multi-day task (which day of total)
 * @param task - The task to check
 * @param taskStartDate - The start date of the task (ISO string)
 * @param currentDate - The date to check progress for (ISO string)
 * @returns Object with currentDay (1-indexed) and totalDays, or null if not a multi-day task
 */
export function getTaskProgress(
  task: Task,
  taskStartDate: string,
  currentDate: string
): { currentDay: number; totalDays: number } | null {
  if (!task.endDate || task.endDate <= taskStartDate) {
    return null
  }

  const days = getTaskDays(task, taskStartDate)
  const totalDays = days.length

  const dayIndex = days.indexOf(currentDate)
  if (dayIndex === -1) {
    return null
  }

  return {
    currentDay: dayIndex + 1,
    totalDays,
  }
}

/**
 * Checks if a task appears on a specific date
 * @param task - The task to check
 * @param taskStartDate - The start date of the task (ISO string)
 * @param date - The date to check (ISO string)
 * @returns True if the task should appear on the given date
 */
export function isTaskOnDate(task: Task, taskStartDate: string, date: string): boolean {
  // Task is always on its start date
  if (date === taskStartDate) {
    return true
  }

  // If no end date, task is only on its start date
  if (!task.endDate) {
    return false
  }

  // Check if date is within the task's date range
  return date >= taskStartDate && date <= task.endDate
}

/**
 * Gets the position of a date within a multi-day task
 * @param task - The task to check
 * @param taskStartDate - The start date of the task (ISO string)
 * @param date - The date to check (ISO string)
 * @returns 'start', 'middle', 'end', or 'single' for single-day tasks
 */
export function getTaskDayPosition(
  task: Task,
  taskStartDate: string,
  date: string
): 'start' | 'middle' | 'end' | 'single' {
  if (!task.endDate || task.endDate <= taskStartDate) {
    return 'single'
  }

  if (date === taskStartDate) {
    return 'start'
  }

  if (date === task.endDate) {
    return 'end'
  }

  if (date > taskStartDate && date < task.endDate) {
    return 'middle'
  }

  return 'single'
}

/**
 * Calculates the total number of days a task spans
 * @param task - The task to check
 * @param taskStartDate - The start date of the task (ISO string)
 * @returns Total number of days
 */
export function getTaskTotalDays(task: Task, taskStartDate: string): number {
  if (!task.endDate || task.endDate <= taskStartDate) {
    return 1
  }

  const startDate = parseDate(taskStartDate)
  const endDate = parseDate(task.endDate)
  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

  return diffDays
}

/**
 * Format the date range for display
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  const startMonth = start.toLocaleDateString(undefined, { month: 'short' })
  const endMonth = end.toLocaleDateString(undefined, { month: 'short' })

  const startDay = start.getDate()
  const endDay = end.getDate()

  if (start.getFullYear() !== end.getFullYear()) {
    return `${startMonth} ${startDay}, ${start.getFullYear()} - ${endMonth} ${endDay}, ${end.getFullYear()}`
  }

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
}

/**
 * Get multi-day tasks that should appear on a specific date
 * @param tasksByDate - All tasks organized by date
 * @param targetDate - The date to check (ISO string)
 * @returns Array of tasks with their original start dates
 */
export function getMultiDayTasksForDate(
  tasksByDate: Record<string, Task[]>,
  targetDate: string
): Array<{ task: Task; startDate: string }> {
  const result: Array<{ task: Task; startDate: string }> = []

  // Check all dates for multi-day tasks that span to targetDate
  for (const [startDate, tasks] of Object.entries(tasksByDate)) {
    // Only check dates before or equal to target date
    if (startDate > targetDate) continue

    for (const task of tasks) {
      // Skip if task doesn't have an end date or ends before target date
      if (!task.endDate) continue

      // Check if this task spans to the target date (excluding the start date itself)
      if (startDate !== targetDate && isTaskOnDate(task, startDate, targetDate)) {
        result.push({ task, startDate })
      }
    }
  }

  return result
}
