import type { Task, TasksByDate, CategoriesByDate, HabitDefinition, HabitEntry, Subtask, TaskLink, RecurrencePattern, TaskTemplate } from '@/lib/types'

// Import data types
export type MergeStrategy = 'replace' | 'merge_keep' | 'merge_overwrite'

export type ImportType = 'json' | 'csv_tasks' | 'csv_habits'

export interface ImportedTask {
  id?: string
  startTime: string
  approxEndTime: string
  description: string
  completed?: boolean
  priority?: 'high' | 'medium' | 'low' | null
  actualEndTime?: string
  durationSeconds?: number
  links?: TaskLink[]
  tags?: string[]
  notes?: string | null
  subtasks?: Subtask[]
  recurrence?: RecurrencePattern
  parentTaskId?: string
  order?: number
  endDate?: string
  date?: string // For CSV imports
}

export interface ImportedHabit {
  id?: string
  name: string
  color: string
  icon: string
  goal?: number
}

export interface ImportData {
  tasksByDate?: TasksByDate
  categoriesByDate?: CategoriesByDate
  habits?: HabitDefinition[]
  templates?: TaskTemplate[]
}

export interface ValidationError {
  field: string
  message: string
  row?: number
}

export interface ImportValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  data?: ImportData
}

export interface ImportSummary {
  tasksAdded: number
  tasksUpdated: number
  tasksSkipped: number
  habitsAdded: number
  habitsUpdated: number
  habitsSkipped: number
  categoriesUpdated: number
  errors: string[]
}

// Time format validation
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate time format (HH:MM or HH:MM:SS)
 */
export function isValidTimeFormat(time: string): boolean {
  return TIME_REGEX.test(time)
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  if (!DATE_REGEX.test(date)) return false
  const d = new Date(date + 'T00:00:00')
  return !isNaN(d.getTime())
}

/**
 * Validate priority value
 */
export function isValidPriority(priority: unknown): priority is 'high' | 'medium' | 'low' | null {
  return priority === null || priority === 'high' || priority === 'medium' || priority === 'low'
}

/**
 * Parse JSON import content
 */
export function parseJSONImport(content: string): ImportValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  try {
    const parsed = JSON.parse(content)

    // Handle different JSON formats
    let importData: ImportData = {}

    // Check if it's a full app state export
    if (parsed.tasksByDate || parsed.categoriesByDate || parsed.habits || parsed.templates) {
      importData = {
        tasksByDate: parsed.tasksByDate,
        categoriesByDate: parsed.categoriesByDate,
        habits: parsed.habits,
        templates: parsed.templates,
      }
    }
    // Check if it's an array of tasks with dates
    else if (Array.isArray(parsed)) {
      const tasksByDate: TasksByDate = {}

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i]
        if (item.date && item.description) {
          const date = item.date
          if (!tasksByDate[date]) {
            tasksByDate[date] = []
          }
          const { date: _, ...taskData } = item
          tasksByDate[date].push(taskData as Task)
        } else {
          warnings.push(`Item at index ${i} is missing required fields (date, description)`)
        }
      }

      importData.tasksByDate = tasksByDate
    }
    // Check if it's a single date's tasks
    else if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.date) {
      importData.tasksByDate = {
        [parsed.date]: parsed.tasks,
      }
    }
    else {
      errors.push({
        field: 'root',
        message: 'Invalid JSON structure. Expected tasksByDate, tasks array, or full app state.',
      })
      return { isValid: false, errors, warnings }
    }

    // Validate the parsed data
    const validationResult = validateImportData(importData)

    return {
      isValid: validationResult.isValid,
      errors: [...errors, ...validationResult.errors],
      warnings: [...warnings, ...validationResult.warnings],
      data: importData,
    }
  } catch (e) {
    errors.push({
      field: 'root',
      message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
    })
    return { isValid: false, errors, warnings }
  }
}

/**
 * Parse CSV content for tasks
 */
export function parseCSVImport(content: string, type: 'tasks' | 'habits'): ImportValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  try {
    const lines = content.trim().split('\n')
    if (lines.length < 2) {
      errors.push({
        field: 'root',
        message: 'CSV must have at least a header row and one data row',
      })
      return { isValid: false, errors, warnings }
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

    if (type === 'tasks') {
      return parseTasksCSV(headers, lines.slice(1), errors, warnings)
    } else {
      return parseHabitsCSV(headers, lines.slice(1), errors, warnings)
    }
  } catch (e) {
    errors.push({
      field: 'root',
      message: `CSV parse error: ${e instanceof Error ? e.message : 'Unknown error'}`,
    })
    return { isValid: false, errors, warnings }
  }
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Parse tasks from CSV
 */
function parseTasksCSV(
  headers: string[],
  dataLines: string[],
  errors: ValidationError[],
  warnings: string[]
): ImportValidationResult {
  // Required columns
  const requiredColumns = ['date', 'starttime', 'approxendtime', 'description']
  const missingColumns = requiredColumns.filter(col =>
    !headers.includes(col) &&
    !headers.includes(col.replace(/([A-Z])/g, '_$1').toLowerCase())
  )

  // Also check for alternative column names
  const hasDate = headers.includes('date')
  const hasStartTime = headers.includes('starttime') || headers.includes('start_time') || headers.includes('start time')
  const hasEndTime = headers.includes('approxendtime') || headers.includes('approx_end_time') || headers.includes('end_time') || headers.includes('endtime')
  const hasDescription = headers.includes('description') || headers.includes('task') || headers.includes('title')

  if (!hasDate || !hasStartTime || !hasEndTime || !hasDescription) {
    errors.push({
      field: 'headers',
      message: `Missing required columns. Need: date, startTime, approxEndTime, description. Found: ${headers.join(', ')}`,
    })
    return { isValid: false, errors, warnings }
  }

  const tasksByDate: TasksByDate = {}

  // Find column indices
  const dateIdx = headers.indexOf('date')
  const startTimeIdx = headers.findIndex(h => ['starttime', 'start_time', 'start time'].includes(h))
  const endTimeIdx = headers.findIndex(h => ['approxendtime', 'approx_end_time', 'end_time', 'endtime'].includes(h))
  const descIdx = headers.findIndex(h => ['description', 'task', 'title'].includes(h))
  const priorityIdx = headers.indexOf('priority')
  const completedIdx = headers.indexOf('completed')
  const tagsIdx = headers.indexOf('tags')
  const notesIdx = headers.indexOf('notes')

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const rowNum = i + 2 // Account for header row and 0-indexing

    const date = values[dateIdx]?.trim()
    const startTime = values[startTimeIdx]?.trim()
    const approxEndTime = values[endTimeIdx]?.trim()
    const description = values[descIdx]?.trim()

    // Validate required fields
    if (!date || !startTime || !approxEndTime || !description) {
      errors.push({
        field: 'row',
        message: `Row ${rowNum}: Missing required fields`,
        row: rowNum,
      })
      continue
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
      errors.push({
        field: 'date',
        message: `Row ${rowNum}: Invalid date format "${date}". Expected YYYY-MM-DD`,
        row: rowNum,
      })
      continue
    }

    // Validate time formats
    if (!isValidTimeFormat(startTime)) {
      errors.push({
        field: 'startTime',
        message: `Row ${rowNum}: Invalid start time format "${startTime}". Expected HH:MM or HH:MM:SS`,
        row: rowNum,
      })
      continue
    }

    if (!isValidTimeFormat(approxEndTime)) {
      errors.push({
        field: 'approxEndTime',
        message: `Row ${rowNum}: Invalid end time format "${approxEndTime}". Expected HH:MM or HH:MM:SS`,
        row: rowNum,
      })
      continue
    }

    // Create task
    const task: Task = {
      id: `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startTime,
      approxEndTime,
      description,
      completed: completedIdx >= 0 ? values[completedIdx]?.toLowerCase() === 'true' : false,
      notes: notesIdx >= 0 ? values[notesIdx] || null : null,
    }

    // Handle priority
    if (priorityIdx >= 0 && values[priorityIdx]) {
      const priority = values[priorityIdx].toLowerCase()
      if (isValidPriority(priority)) {
        task.priority = priority
      } else if (priority && priority !== '') {
        warnings.push(`Row ${rowNum}: Invalid priority "${values[priorityIdx]}", skipping`)
      }
    }

    // Handle tags
    if (tagsIdx >= 0 && values[tagsIdx]) {
      task.tags = values[tagsIdx].split(';').map(t => t.trim()).filter(t => t)
    }

    // Add to tasksByDate
    if (!tasksByDate[date]) {
      tasksByDate[date] = []
    }
    tasksByDate[date].push(task)
  }

  // Sort tasks by start time for each date
  for (const date in tasksByDate) {
    tasksByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: { tasksByDate },
  }
}

/**
 * Parse habits from CSV
 */
function parseHabitsCSV(
  headers: string[],
  dataLines: string[],
  errors: ValidationError[],
  warnings: string[]
): ImportValidationResult {
  // Required columns
  const hasName = headers.includes('name')
  const hasColor = headers.includes('color')
  const hasIcon = headers.includes('icon')

  if (!hasName || !hasColor || !hasIcon) {
    errors.push({
      field: 'headers',
      message: `Missing required columns. Need: name, color, icon. Found: ${headers.join(', ')}`,
    })
    return { isValid: false, errors, warnings }
  }

  const habits: HabitDefinition[] = []

  const nameIdx = headers.indexOf('name')
  const colorIdx = headers.indexOf('color')
  const iconIdx = headers.indexOf('icon')
  const goalIdx = headers.indexOf('goal')

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const rowNum = i + 2

    const name = values[nameIdx]?.trim()
    const color = values[colorIdx]?.trim()
    const icon = values[iconIdx]?.trim()

    if (!name || !color || !icon) {
      errors.push({
        field: 'row',
        message: `Row ${rowNum}: Missing required fields (name, color, icon)`,
        row: rowNum,
      })
      continue
    }

    const habit: HabitDefinition = {
      id: `habit-imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      color,
      icon,
    }

    // Handle goal
    if (goalIdx >= 0 && values[goalIdx]) {
      const goal = parseInt(values[goalIdx], 10)
      if (!isNaN(goal) && goal > 0) {
        habit.goal = goal
      } else if (values[goalIdx] !== '') {
        warnings.push(`Row ${rowNum}: Invalid goal value "${values[goalIdx]}", skipping`)
      }
    }

    habits.push(habit)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data: { habits },
  }
}

/**
 * Validate import data structure
 */
export function validateImportData(data: ImportData): ImportValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate tasksByDate
  if (data.tasksByDate) {
    for (const [date, tasks] of Object.entries(data.tasksByDate)) {
      // Validate date format
      if (!isValidDateFormat(date)) {
        errors.push({
          field: 'tasksByDate',
          message: `Invalid date key "${date}". Expected YYYY-MM-DD format`,
        })
        continue
      }

      // Validate each task
      if (!Array.isArray(tasks)) {
        errors.push({
          field: 'tasksByDate',
          message: `Tasks for date ${date} must be an array`,
        })
        continue
      }

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        const taskPath = `tasksByDate.${date}[${i}]`

        // Required fields
        if (!task.description || typeof task.description !== 'string') {
          errors.push({
            field: taskPath,
            message: `${taskPath}: Missing or invalid description`,
          })
        }

        if (!task.startTime || !isValidTimeFormat(task.startTime)) {
          errors.push({
            field: taskPath,
            message: `${taskPath}: Invalid startTime "${task.startTime}"`,
          })
        }

        if (!task.approxEndTime || !isValidTimeFormat(task.approxEndTime)) {
          errors.push({
            field: taskPath,
            message: `${taskPath}: Invalid approxEndTime "${task.approxEndTime}"`,
          })
        }

        // Optional field validations
        if (task.priority !== undefined && !isValidPriority(task.priority)) {
          errors.push({
            field: taskPath,
            message: `${taskPath}: Invalid priority "${task.priority}". Must be high, medium, low, or null`,
          })
        }

        if (task.tags && !Array.isArray(task.tags)) {
          errors.push({
            field: taskPath,
            message: `${taskPath}: tags must be an array`,
          })
        }

        if (task.actualEndTime && !isValidTimeFormat(task.actualEndTime)) {
          warnings.push(`${taskPath}: Invalid actualEndTime format, will be ignored`)
        }

        if (task.endDate && !isValidDateFormat(task.endDate)) {
          warnings.push(`${taskPath}: Invalid endDate format, will be ignored`)
        }
      }
    }
  }

  // Validate habits
  if (data.habits) {
    if (!Array.isArray(data.habits)) {
      errors.push({
        field: 'habits',
        message: 'habits must be an array',
      })
    } else {
      for (let i = 0; i < data.habits.length; i++) {
        const habit = data.habits[i]
        const habitPath = `habits[${i}]`

        if (!habit.name || typeof habit.name !== 'string') {
          errors.push({
            field: habitPath,
            message: `${habitPath}: Missing or invalid name`,
          })
        }

        if (!habit.color || typeof habit.color !== 'string') {
          errors.push({
            field: habitPath,
            message: `${habitPath}: Missing or invalid color`,
          })
        }

        if (!habit.icon || typeof habit.icon !== 'string') {
          errors.push({
            field: habitPath,
            message: `${habitPath}: Missing or invalid icon`,
          })
        }

        if (habit.goal !== undefined && (typeof habit.goal !== 'number' || habit.goal <= 0)) {
          warnings.push(`${habitPath}: Invalid goal value, will be ignored`)
        }
      }
    }
  }

  // Validate categoriesByDate
  if (data.categoriesByDate) {
    for (const [date, categories] of Object.entries(data.categoriesByDate)) {
      if (!isValidDateFormat(date)) {
        errors.push({
          field: 'categoriesByDate',
          message: `Invalid date key "${date}" in categoriesByDate`,
        })
      }

      if (typeof categories !== 'object' || categories === null) {
        errors.push({
          field: 'categoriesByDate',
          message: `Categories for date ${date} must be an object`,
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data,
  }
}

/**
 * Merge imported data with existing data
 */
export function mergeImportData(
  existing: ImportData,
  imported: ImportData,
  strategy: MergeStrategy
): { merged: ImportData; summary: ImportSummary } {
  const summary: ImportSummary = {
    tasksAdded: 0,
    tasksUpdated: 0,
    tasksSkipped: 0,
    habitsAdded: 0,
    habitsUpdated: 0,
    habitsSkipped: 0,
    categoriesUpdated: 0,
    errors: [],
  }

  const merged: ImportData = {
    tasksByDate: { ...existing.tasksByDate },
    categoriesByDate: { ...existing.categoriesByDate },
    habits: existing.habits ? [...existing.habits] : [],
    templates: existing.templates ? [...existing.templates] : [],
  }

  // Merge tasks
  if (imported.tasksByDate) {
    if (strategy === 'replace') {
      // Replace all - just use imported tasks
      merged.tasksByDate = { ...imported.tasksByDate }

      for (const tasks of Object.values(imported.tasksByDate)) {
        summary.tasksAdded += tasks.length
      }
    } else {
      // Merge strategies
      for (const [date, importedTasks] of Object.entries(imported.tasksByDate)) {
        const existingTasks = merged.tasksByDate?.[date] || []

        if (strategy === 'merge_keep') {
          // Keep existing, add new (by description match)
          const existingDescriptions = new Set(existingTasks.map(t => t.description.toLowerCase()))

          const newTasks = importedTasks.filter(t => {
            if (existingDescriptions.has(t.description.toLowerCase())) {
              summary.tasksSkipped++
              return false
            }
            return true
          })

          // Generate new IDs for imported tasks
          const tasksWithIds = newTasks.map(t => ({
            ...t,
            id: t.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }))

          summary.tasksAdded += tasksWithIds.length

          merged.tasksByDate![date] = [...existingTasks, ...tasksWithIds]
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        } else if (strategy === 'merge_overwrite') {
          // Merge and overwrite duplicates (by description match)
          const taskMap = new Map<string, Task>()

          // Add existing tasks
          for (const task of existingTasks) {
            taskMap.set(task.description.toLowerCase(), task)
          }

          // Overwrite with imported tasks
          for (const task of importedTasks) {
            const key = task.description.toLowerCase()
            const taskWithId = {
              ...task,
              id: taskMap.get(key)?.id || task.id || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            }

            if (taskMap.has(key)) {
              summary.tasksUpdated++
            } else {
              summary.tasksAdded++
            }

            taskMap.set(key, taskWithId)
          }

          merged.tasksByDate![date] = Array.from(taskMap.values())
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        }
      }
    }
  }

  // Merge habits
  if (imported.habits && imported.habits.length > 0) {
    if (strategy === 'replace') {
      merged.habits = imported.habits.map(h => ({
        ...h,
        id: h.id || `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }))
      summary.habitsAdded = imported.habits.length
    } else {
      const existingNames = new Set((merged.habits || []).map(h => h.name.toLowerCase()))
      const habitMap = new Map<string, HabitDefinition>()

      // Add existing habits
      for (const habit of merged.habits || []) {
        habitMap.set(habit.name.toLowerCase(), habit)
      }

      // Process imported habits
      for (const habit of imported.habits) {
        const key = habit.name.toLowerCase()

        if (strategy === 'merge_keep') {
          if (existingNames.has(key)) {
            summary.habitsSkipped++
          } else {
            const habitWithId = {
              ...habit,
              id: habit.id || `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            }
            habitMap.set(key, habitWithId)
            summary.habitsAdded++
          }
        } else if (strategy === 'merge_overwrite') {
          const habitWithId = {
            ...habit,
            id: habitMap.get(key)?.id || habit.id || `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          }

          if (habitMap.has(key)) {
            summary.habitsUpdated++
          } else {
            summary.habitsAdded++
          }

          habitMap.set(key, habitWithId)
        }
      }

      merged.habits = Array.from(habitMap.values())
    }
  }

  // Merge categories
  if (imported.categoriesByDate) {
    if (strategy === 'replace') {
      merged.categoriesByDate = { ...imported.categoriesByDate }
      summary.categoriesUpdated = Object.keys(imported.categoriesByDate).length
    } else {
      for (const [date, categories] of Object.entries(imported.categoriesByDate)) {
        if (strategy === 'merge_keep') {
          if (!merged.categoriesByDate![date]) {
            merged.categoriesByDate![date] = categories
            summary.categoriesUpdated++
          }
        } else if (strategy === 'merge_overwrite') {
          merged.categoriesByDate![date] = {
            ...(merged.categoriesByDate![date] || {}),
            ...categories,
          }
          summary.categoriesUpdated++
        }
      }
    }
  }

  return { merged, summary }
}

/**
 * Detect import format from file content
 */
export function detectImportFormat(content: string, filename?: string): ImportType {
  const trimmed = content.trim()

  // Check file extension first
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'json') return 'json'
    if (ext === 'csv') {
      // Try to detect if it's tasks or habits CSV
      const firstLine = trimmed.split('\n')[0].toLowerCase()
      if (firstLine.includes('name') && firstLine.includes('color') && firstLine.includes('icon')) {
        return 'csv_habits'
      }
      return 'csv_tasks'
    }
  }

  // Try to detect from content
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return 'json'
  }

  // Assume CSV, detect type from headers
  const firstLine = trimmed.split('\n')[0].toLowerCase()
  if (firstLine.includes('name') && firstLine.includes('color') && firstLine.includes('icon')) {
    return 'csv_habits'
  }

  return 'csv_tasks'
}

/**
 * Generate sample CSV template for tasks
 */
export function generateTasksCSVTemplate(): string {
  return `date,startTime,approxEndTime,description,priority,completed,tags,notes
2025-01-15,09:00,10:00,Morning standup,high,false,work;meeting,Daily team sync
2025-01-15,10:30,12:00,Project work,medium,false,work,Focus time for coding
2025-01-15,14:00,15:00,Client call,high,false,work;client,Quarterly review`
}

/**
 * Generate sample CSV template for habits
 */
export function generateHabitsCSVTemplate(): string {
  return `name,color,icon,goal
Water,rgb(14, 165, 233),Droplets,8
Exercise,rgb(249, 115, 22),Dumbbell,
Reading,rgb(167, 139, 250),Book,30`
}

/**
 * Generate sample JSON template
 */
export function generateJSONTemplate(): string {
  const template: ImportData = {
    tasksByDate: {
      '2025-01-15': [
        {
          id: 'sample-1',
          startTime: '09:00',
          approxEndTime: '10:00',
          description: 'Morning standup',
          completed: false,
          priority: 'high',
          tags: ['work', 'meeting'],
          notes: 'Daily team sync',
        },
        {
          id: 'sample-2',
          startTime: '10:30',
          approxEndTime: '12:00',
          description: 'Project work',
          completed: false,
          priority: 'medium',
          tags: ['work'],
          notes: 'Focus time for coding',
        },
      ],
    },
    habits: [
      {
        id: 'sample-habit-1',
        name: 'Water',
        color: 'rgb(14, 165, 233)',
        icon: 'Droplets',
        goal: 8,
      },
    ],
  }

  return JSON.stringify(template, null, 2)
}
