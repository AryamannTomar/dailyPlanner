import type { Task, TasksByDate, CategoriesByDate, HabitDefinition, HabitEntry, AppState } from '@/lib/types'
import { isHabitCompleted, getHabitValue, getHabitGoal } from '@/lib/types'

export interface ExportDataOptions {
  fromDate?: string
  toDate?: string
  type?: 'all' | 'tasks' | 'habits'
}

export interface TaskWithDate extends Task {
  date: string
}

export interface HabitDataRow {
  date: string
  habitName: string
  value: number
  goal: number
  completed: boolean
}

/**
 * Export full state as JSON
 */
export function exportToJSON(
  state: AppState,
  options: ExportDataOptions = {}
): string {
  const { fromDate, toDate, type = 'all' } = options

  let exportData: Partial<AppState> = {}

  if (type === 'all' || type === 'tasks') {
    const filteredTasks = filterTasksByDateRange(state.tasksByDate, fromDate, toDate)
    exportData.tasksByDate = filteredTasks
  }

  if (type === 'all' || type === 'habits') {
    const filteredCategories = filterCategoriesByDateRange(state.categoriesByDate, fromDate, toDate)
    exportData.categoriesByDate = filteredCategories
    exportData.habits = state.habits
  }

  if (type === 'all') {
    exportData.templates = state.templates
    exportData.dailyGoals = state.dailyGoals
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Export tasks as CSV
 * Format: Date, StartTime, EndTime, Description, Completed, Priority, Tags, Notes
 */
export function exportToCSV(
  tasksByDate: TasksByDate,
  options: ExportDataOptions = {}
): string {
  const { fromDate, toDate } = options
  const filteredTasks = filterTasksByDateRange(tasksByDate, fromDate, toDate)

  // CSV Headers
  const headers = [
    'Date',
    'StartTime',
    'EndTime',
    'Description',
    'Completed',
    'Priority',
    'Tags',
    'Notes'
  ]

  const rows: string[][] = [headers]

  // Sort dates chronologically
  const sortedDates = Object.keys(filteredTasks).sort()

  for (const date of sortedDates) {
    const tasks = filteredTasks[date] || []

    // Sort tasks by start time
    const sortedTasks = [...tasks].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    )

    for (const task of sortedTasks) {
      const row = [
        date,
        task.startTime,
        task.actualEndTime || task.approxEndTime,
        task.description,
        task.completed ? 'Yes' : 'No',
        task.priority || '',
        (task.tags || []).join('; '),
        task.notes || ''
      ]
      rows.push(row)
    }
  }

  return formatCSV(rows)
}

/**
 * Export habit data as CSV
 * Format: Date, HabitName, Value, Goal, Completed
 */
export function exportHabitsToCSV(
  categoriesByDate: CategoriesByDate,
  habits: HabitDefinition[],
  options: ExportDataOptions = {}
): string {
  const { fromDate, toDate } = options
  const filteredCategories = filterCategoriesByDateRange(categoriesByDate, fromDate, toDate)

  // CSV Headers
  const headers = [
    'Date',
    'HabitName',
    'Value',
    'Goal',
    'Completed'
  ]

  const rows: string[][] = [headers]

  // Sort dates chronologically
  const sortedDates = Object.keys(filteredCategories).sort()

  for (const date of sortedDates) {
    const categoryState = filteredCategories[date] || {}

    for (const habit of habits) {
      const entry = categoryState[habit.id]

      if (entry !== undefined) {
        const value = getHabitValue(entry)
        const goal = habit.goal || 1
        const completed = isHabitCompleted(entry)

        const row = [
          date,
          habit.name,
          value.toString(),
          goal.toString(),
          completed ? 'Yes' : 'No'
        ]
        rows.push(row)
      }
    }
  }

  return formatCSV(rows)
}

/**
 * Filter tasks by date range
 */
function filterTasksByDateRange(
  tasksByDate: TasksByDate,
  fromDate?: string,
  toDate?: string
): TasksByDate {
  if (!fromDate && !toDate) {
    return tasksByDate
  }

  const filtered: TasksByDate = {}
  const from = fromDate ? new Date(fromDate + 'T00:00:00') : null
  const to = toDate ? new Date(toDate + 'T23:59:59') : null

  for (const [dateKey, tasks] of Object.entries(tasksByDate)) {
    const date = new Date(dateKey + 'T00:00:00')

    if (from && date < from) continue
    if (to && date > to) continue

    filtered[dateKey] = tasks
  }

  return filtered
}

/**
 * Filter categories by date range
 */
function filterCategoriesByDateRange(
  categoriesByDate: CategoriesByDate,
  fromDate?: string,
  toDate?: string
): CategoriesByDate {
  if (!fromDate && !toDate) {
    return categoriesByDate
  }

  const filtered: CategoriesByDate = {}
  const from = fromDate ? new Date(fromDate + 'T00:00:00') : null
  const to = toDate ? new Date(toDate + 'T23:59:59') : null

  for (const [dateKey, categories] of Object.entries(categoriesByDate)) {
    const date = new Date(dateKey + 'T00:00:00')

    if (from && date < from) continue
    if (to && date > to) continue

    filtered[dateKey] = categories
  }

  return filtered
}

/**
 * Format rows as proper CSV with escaping
 */
function formatCSV(rows: string[][]): string {
  return rows.map(row =>
    row.map(cell => escapeCSVField(cell)).join(',')
  ).join('\n')
}

/**
 * Escape a CSV field value
 * - Wrap in quotes if contains comma, newline, or quote
 * - Escape quotes by doubling them
 */
function escapeCSVField(field: string): string {
  const stringField = String(field)

  // Check if field needs quoting
  const needsQuoting = stringField.includes(',') ||
                       stringField.includes('\n') ||
                       stringField.includes('\r') ||
                       stringField.includes('"')

  if (needsQuoting) {
    // Escape quotes by doubling them and wrap in quotes
    const escaped = stringField.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return stringField
}

/**
 * Download content as a file in the browser
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
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
 * Generate export filename with date
 */
export function generateExportFilename(
  type: 'json' | 'csv',
  dataType: 'all' | 'tasks' | 'habits',
  fromDate?: string,
  toDate?: string
): string {
  const datePart = fromDate && toDate
    ? `_${fromDate}_to_${toDate}`
    : `_${new Date().toISOString().split('T')[0]}`

  const typePart = dataType === 'all' ? 'data' : dataType

  return `dailyplanner_${typePart}${datePart}.${type}`
}

/**
 * Count tasks in date range
 */
export function countTasksInRange(
  tasksByDate: TasksByDate,
  fromDate?: string,
  toDate?: string
): number {
  const filtered = filterTasksByDateRange(tasksByDate, fromDate, toDate)
  return Object.values(filtered).reduce((sum, tasks) => sum + tasks.length, 0)
}

/**
 * Count habit entries in date range
 */
export function countHabitEntriesInRange(
  categoriesByDate: CategoriesByDate,
  habits: HabitDefinition[],
  fromDate?: string,
  toDate?: string
): number {
  const filtered = filterCategoriesByDateRange(categoriesByDate, fromDate, toDate)
  let count = 0

  for (const dateKey of Object.keys(filtered)) {
    const categoryState = filtered[dateKey] || {}
    for (const habit of habits) {
      if (categoryState[habit.id] !== undefined) {
        count++
      }
    }
  }

  return count
}
