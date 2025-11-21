import type { Task, TasksByDate } from '@/lib/types'
import { formatISODate, addDays } from '@/lib/date-utils'

/**
 * Get incomplete tasks for a specific date
 */
export function getIncompleteTasks(tasksByDate: TasksByDate, date: string): Task[] {
  const tasks = tasksByDate[date] || []
  return tasks.filter(task => !task.completed)
}

/**
 * Get completed tasks for a specific date
 */
export function getCompletedTasks(tasksByDate: TasksByDate, date: string): Task[] {
  const tasks = tasksByDate[date] || []
  return tasks.filter(task => task.completed)
}

/**
 * Carry over tasks from one date to another
 * Returns the new tasks that were created for the target date
 */
export function carryOverTasks(
  tasksByDate: TasksByDate,
  fromDate: string,
  toDate: string,
  taskIds?: string[]
): {
  newTasks: Task[],
  updatedTasksByDate: TasksByDate
} {
  const sourceTasks = tasksByDate[fromDate] || []

  // Filter tasks to carry over
  let tasksToCarry: Task[]
  if (taskIds && taskIds.length > 0) {
    tasksToCarry = sourceTasks.filter(
      task => taskIds.includes(task.id) && !task.completed
    )
  } else {
    // Carry all incomplete tasks
    tasksToCarry = sourceTasks.filter(task => !task.completed)
  }

  // Create new tasks for the target date
  const newTasks: Task[] = tasksToCarry.map(task => ({
    ...task,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    completed: false,
    // Reset completion-related fields
    actualEndTime: undefined,
    durationSeconds: undefined,
    // Preserve subtasks but reset their completion status
    subtasks: task.subtasks?.map(subtask => ({
      ...subtask,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      completed: false,
    })),
  }))

  // Update tasksByDate with new tasks
  const existingTargetTasks = tasksByDate[toDate] || []
  const updatedTargetTasks = [...existingTargetTasks, ...newTasks]

  // Sort by start time
  updatedTargetTasks.sort((a, b) =>
    a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0
  )

  const updatedTasksByDate: TasksByDate = {
    ...tasksByDate,
    [toDate]: updatedTargetTasks,
  }

  return { newTasks, updatedTasksByDate }
}

/**
 * Get yesterday's date as ISO string
 */
export function getYesterdayISO(): string {
  const today = new Date()
  const yesterday = addDays(today, -1)
  return formatISODate(yesterday)
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO(): string {
  return formatISODate(new Date())
}

/**
 * Get carry-over suggestions (yesterday's incomplete tasks)
 */
export function getCarryOverSuggestions(tasksByDate: TasksByDate): {
  fromDate: string
  toDate: string
  tasks: Task[]
} {
  const fromDate = getYesterdayISO()
  const toDate = getTodayISO()
  const tasks = getIncompleteTasks(tasksByDate, fromDate)

  return {
    fromDate,
    toDate,
    tasks,
  }
}

/**
 * Check if there are tasks to carry over from yesterday
 */
export function hasCarryOverSuggestions(tasksByDate: TasksByDate): boolean {
  const { tasks } = getCarryOverSuggestions(tasksByDate)
  return tasks.length > 0
}

/**
 * Delete tasks from a date (used when carrying over with delete original option)
 */
export function deleteTasksFromDate(
  tasksByDate: TasksByDate,
  date: string,
  taskIds: string[]
): TasksByDate {
  const tasks = tasksByDate[date] || []
  const filteredTasks = tasks.filter(task => !taskIds.includes(task.id))

  return {
    ...tasksByDate,
    [date]: filteredTasks,
  }
}

/**
 * Mark tasks as completed on a date
 */
export function markTasksCompleted(
  tasksByDate: TasksByDate,
  date: string,
  taskIds: string[]
): TasksByDate {
  const tasks = tasksByDate[date] || []
  const updatedTasks = tasks.map(task => {
    if (taskIds.includes(task.id)) {
      return {
        ...task,
        completed: true,
      }
    }
    return task
  })

  return {
    ...tasksByDate,
    [date]: updatedTasks,
  }
}
