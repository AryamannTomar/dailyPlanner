import type { Task } from '@/lib/types'

export interface ExportOptions {
  fromDate?: string
  toDate?: string
  includeCompleted?: boolean
  productId?: string
}

export interface TaskWithDate extends Task {
  date: string
}

/**
 * Generate a unique identifier for iCal events
 */
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}@dailyplanner`
}

/**
 * Format a date and time for iCal format (YYYYMMDDTHHMMSS)
 */
function formatICalDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-')
  // Handle both HH:MM and HH:MM:SS formats
  const timeParts = time.split(':')
  const hours = timeParts[0] || '00'
  const minutes = timeParts[1] || '00'
  const seconds = timeParts[2] || '00'
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

/**
 * Format a date for iCal format (YYYYMMDD)
 */
function formatICalDate(date: string): string {
  return date.replace(/-/g, '')
}

/**
 * Get current timestamp in iCal format
 */
function getICalTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

/**
 * Escape special characters for iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Fold long lines according to iCal spec (max 75 chars)
 */
function foldLine(line: string): string {
  const maxLength = 75
  if (line.length <= maxLength) return line

  const result: string[] = []
  let remaining = line
  let isFirst = true

  while (remaining.length > 0) {
    if (isFirst) {
      result.push(remaining.slice(0, maxLength))
      remaining = remaining.slice(maxLength)
      isFirst = false
    } else {
      // Continuation lines start with a space
      result.push(' ' + remaining.slice(0, maxLength - 1))
      remaining = remaining.slice(maxLength - 1)
    }
  }

  return result.join('\r\n')
}

/**
 * Build description with task details
 */
function buildEventDescription(task: Task): string {
  const parts: string[] = []

  if (task.notes) {
    parts.push(task.notes)
  }

  if (task.priority) {
    parts.push(`Priority: ${task.priority}`)
  }

  if (task.tags && task.tags.length > 0) {
    parts.push(`Tags: ${task.tags.join(', ')}`)
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const subtaskList = task.subtasks
      .map(s => `${s.completed ? '[x]' : '[ ]'} ${s.description}`)
      .join('\\n')
    parts.push(`Subtasks:\\n${subtaskList}`)
  }

  if (task.links && task.links.length > 0) {
    const linkList = task.links
      .map(l => `${l.title}: ${l.url}`)
      .join('\\n')
    parts.push(`Links:\\n${linkList}`)
  }

  return parts.join('\\n\\n')
}

/**
 * Generate iCal format for a list of tasks
 */
export function generateICS(tasks: TaskWithDate[], options: ExportOptions = {}): string {
  const productId = options.productId || '-//Daily Planner//Calendar Export//EN'
  const timestamp = getICalTimestamp()

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${productId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Daily Planner Tasks',
  ]

  for (const task of tasks) {
    // Skip completed tasks if not included
    if (!options.includeCompleted && task.completed) {
      continue
    }

    const uid = generateUID()
    const dtStart = formatICalDateTime(task.date, task.startTime)
    const dtEnd = formatICalDateTime(task.date, task.actualEndTime || task.approxEndTime)
    const summary = escapeICalText(task.description)
    const description = buildEventDescription(task)

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${timestamp}`)
    lines.push(`DTSTART:${dtStart}`)
    lines.push(`DTEND:${dtEnd}`)
    lines.push(foldLine(`SUMMARY:${summary}`))

    if (description) {
      lines.push(foldLine(`DESCRIPTION:${description}`))
    }

    // Add status based on completion
    if (task.completed) {
      lines.push('STATUS:COMPLETED')
    } else {
      lines.push('STATUS:CONFIRMED')
    }

    // Add priority (iCal uses 1-9, where 1-4 is high, 5 is medium, 6-9 is low)
    if (task.priority) {
      const priorityMap = { high: 1, medium: 5, low: 9 }
      lines.push(`PRIORITY:${priorityMap[task.priority]}`)
    }

    // Add categories from tags
    if (task.tags && task.tags.length > 0) {
      lines.push(`CATEGORIES:${task.tags.map(t => escapeICalText(t)).join(',')}`)
    }

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')

  return lines.join('\r\n')
}

/**
 * Generate a single ICS file for one task
 */
export function generateSingleTaskICS(task: Task, date: string): string {
  const taskWithDate: TaskWithDate = { ...task, date }
  return generateICS([taskWithDate], { includeCompleted: true })
}

/**
 * Generate Google Calendar URL for adding a task
 */
export function generateGoogleCalendarURL(task: Task, date: string): string {
  const baseUrl = 'https://calendar.google.com/calendar/render'

  // Format dates for Google Calendar (YYYYMMDDTHHMMSS)
  const startDateTime = formatICalDateTime(date, task.startTime)
  const endDateTime = formatICalDateTime(date, task.actualEndTime || task.approxEndTime)

  // Build description
  const descriptionParts: string[] = []

  if (task.notes) {
    descriptionParts.push(task.notes)
  }

  if (task.priority) {
    descriptionParts.push(`Priority: ${task.priority}`)
  }

  if (task.tags && task.tags.length > 0) {
    descriptionParts.push(`Tags: ${task.tags.join(', ')}`)
  }

  if (task.subtasks && task.subtasks.length > 0) {
    const subtaskList = task.subtasks
      .map(s => `${s.completed ? '[x]' : '[ ]'} ${s.description}`)
      .join('\n')
    descriptionParts.push(`Subtasks:\n${subtaskList}`)
  }

  if (task.links && task.links.length > 0) {
    const linkList = task.links
      .map(l => `${l.title}: ${l.url}`)
      .join('\n')
    descriptionParts.push(`Links:\n${linkList}`)
  }

  const description = descriptionParts.join('\n\n')

  // Build URL parameters
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: task.description,
    dates: `${startDateTime}/${endDateTime}`,
  })

  if (description) {
    params.set('details', description)
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Download ICS content as a file
 */
export function downloadICS(content: string, filename: string = 'tasks.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format a date for display
 */
export function formatExportDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
