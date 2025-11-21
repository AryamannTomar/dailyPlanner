export type TaskLink = {
  url: string
  title: string
}

export type TaskPriority = "high" | "medium" | "low" | null

export type RecurrencePattern = {
  frequency: "daily" | "weekly" | "monthly"
  interval: number
  endDate?: string
  daysOfWeek?: number[] // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export type Subtask = {
  id: string
  description: string
  completed: boolean
}

export type Task = {
  id: string
  startTime: string // "HH:MM" or "HH:MM:SS"
  approxEndTime: string // "HH:MM" or "HH:MM:SS"
  description: string
  completed: boolean
  priority?: TaskPriority // task priority level
  actualEndTime?: string // set when completed; editable; "HH:MM:SS"
  durationSeconds?: number // auto-computed when completed
  links?: TaskLink[]
  tags?: string[] // optional tags/labels for the task
  notes: string | null // optional task notes, max 500 characters
  subtasks?: Subtask[]
  recurrence?: RecurrencePattern // recurrence pattern for recurring tasks
  parentTaskId?: string // for generated recurring instances, links to parent task
  order?: number // manual sort order for drag and drop reordering
  endDate?: string // ISO date string for multi-day tasks (e.g., "2025-11-25")
}

// Helper function to check if a task is a multi-day task
export function isMultiDayTask(task: Task, taskDate: string): boolean {
  return Boolean(task.endDate && task.endDate > taskDate)
}

export type TasksByDate = Record<string, Task[]>

export type TaskTemplate = {
  id: string
  name: string
  task: Omit<Task, 'id' | 'completed' | 'actualEndTime' | 'durationSeconds'>
}

export type HabitDefinition = {
  id: string
  name: string
  color: string
  icon: string
  goal?: number // Optional goal for numeric habits (e.g., 8 glasses of water)
}

export type CategoryKey = string

// HabitEntry represents either a simple boolean habit or a numeric goal-based habit
export type HabitEntry = boolean | { value: number; goal: number }

export type CategoryState = Record<string, HabitEntry>

export type CategoriesByDate = Record<string, CategoryState>

export type FilterMode = "tasks" | "all" | string

// Daily Goals types
export type GoalType = "tasks" | "hours" | "pomodoros"

export type DailyGoal = {
  id: string
  type: GoalType
  target: number
  current: number
  enabled: boolean
}

export type DailyGoalsConfig = {
  goals: DailyGoal[]
  lastResetDate: string // ISO date string for tracking daily resets
}

// Default goals configuration
export const DEFAULT_DAILY_GOALS: DailyGoal[] = [
  { id: 'tasks-goal', type: 'tasks', target: 5, current: 0, enabled: true },
  { id: 'hours-goal', type: 'hours', target: 4, current: 0, enabled: true },
  { id: 'pomodoros-goal', type: 'pomodoros', target: 4, current: 0, enabled: false },
]

// Helper function to get goal label
export function getGoalLabel(type: GoalType): string {
  switch (type) {
    case 'tasks':
      return 'Tasks'
    case 'hours':
      return 'Hours'
    case 'pomodoros':
      return 'Pomodoros'
  }
}

// Helper function to get goal icon name
export function getGoalIcon(type: GoalType): string {
  switch (type) {
    case 'tasks':
      return 'CheckSquare'
    case 'hours':
      return 'Clock'
    case 'pomodoros':
      return 'Timer'
  }
}

// Helper function to format goal progress
export function formatGoalProgress(type: GoalType, current: number, target: number): string {
  if (type === 'hours') {
    const currentHours = (current / 3600).toFixed(1)
    return `${currentHours}/${target}h`
  }
  return `${current}/${target}`
}

// Helper function to check if goal is completed
export function isGoalCompleted(goal: DailyGoal): boolean {
  if (goal.type === 'hours') {
    return goal.current >= goal.target * 3600 // Convert hours to seconds
  }
  return goal.current >= goal.target
}

// Helper function to get goal completion percentage
export function getGoalCompletionPercent(goal: DailyGoal): number {
  if (!goal.enabled) return 0
  let target = goal.target
  let current = goal.current

  if (goal.type === 'hours') {
    target = goal.target * 3600 // Convert hours to seconds
  }

  if (target === 0) return 100
  return Math.min(100, Math.round((current / target) * 100))
}

// Helper function to check if a habit entry is completed
export function isHabitCompleted(entry: HabitEntry): boolean {
  if (typeof entry === 'boolean') {
    return entry
  }
  return entry.value >= entry.goal
}

// Helper function to get completion percentage for a habit
export function getHabitCompletionPercent(entry: HabitEntry): number {
  if (typeof entry === 'boolean') {
    return entry ? 100 : 0
  }
  if (entry.goal === 0) return 100
  return Math.min(100, Math.round((entry.value / entry.goal) * 100))
}

// Helper function to get the current value of a habit entry
export function getHabitValue(entry: HabitEntry): number {
  if (typeof entry === 'boolean') {
    return entry ? 1 : 0
  }
  return entry.value
}

// Helper function to get the goal of a habit entry (1 for boolean habits)
export function getHabitGoal(entry: HabitEntry): number {
  if (typeof entry === 'boolean') {
    return 1
  }
  return entry.goal
}
