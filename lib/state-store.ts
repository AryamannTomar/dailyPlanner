import { promises as fs } from 'fs'
import path from 'path'
import type { Task, TasksByDate, CategoriesByDate, CategoryKey, Subtask, HabitDefinition, HabitEntry, TaskTemplate, RecurrencePattern, DailyGoal, DailyGoalsConfig } from '@/lib/types'
import { DEFAULT_DAILY_GOALS } from '@/lib/types'
import { computeDurationSeconds, nowHMS } from '@/lib/time-utils'
import { generateRecurringDates } from '@/lib/recurrence-utils'

export const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'water', name: 'Water', color: 'rgb(14, 165, 233)', icon: 'Droplets', goal: 8 }, // 8 glasses
  { id: 'meat', name: 'Meat', color: 'rgb(236, 72, 153)', icon: 'Beef' },
  { id: 'sleep', name: 'Sleep', color: 'rgb(167, 139, 250)', icon: 'Moon' },
  { id: 'gym', name: 'Gym', color: 'rgb(249, 115, 22)', icon: 'Dumbbell' },
]

// Helper to get default entry for a habit based on whether it has a goal
function getDefaultHabitEntry(habit: HabitDefinition): HabitEntry {
  if (habit.goal && habit.goal > 0) {
    return { value: 0, goal: habit.goal }
  }
  return false
}

export type AppState = {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  templates: TaskTemplate[]
  dailyGoals?: DailyGoalsConfig
}

const DATA_DIR = path.join(process.cwd(), 'data')
const STATE_FILE = path.join(DATA_DIR, 'state.json')

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch {}
}

async function readRaw(): Promise<AppState | null> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8')
    return JSON.parse(data)
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}

async function writeRaw(state: AppState): Promise<void> {
  await ensureDataDir()
  const json = JSON.stringify(state, null, 2)
  await fs.writeFile(STATE_FILE, json, 'utf8')
}

export async function getState(): Promise<AppState> {
  const existing = await readRaw()
  if (existing) {
    // Ensure backward compatibility - add habits if missing
    if (!existing.habits) {
      existing.habits = DEFAULT_HABITS
    }
    // Ensure backward compatibility - add templates if missing
    if (!existing.templates) {
      existing.templates = []
    }
    // Ensure backward compatibility - add dailyGoals if missing
    if (!existing.dailyGoals) {
      existing.dailyGoals = {
        goals: DEFAULT_DAILY_GOALS.map(g => ({ ...g })),
        lastResetDate: new Date().toISOString().split('T')[0]
      }
    }
    return existing
  }
  return {
    tasksByDate: {},
    categoriesByDate: {},
    habits: DEFAULT_HABITS,
    templates: [],
    dailyGoals: {
      goals: DEFAULT_DAILY_GOALS.map(g => ({ ...g })),
      lastResetDate: new Date().toISOString().split('T')[0]
    }
  }
}

export async function saveState(state: AppState): Promise<void> {
  await writeRaw(state)
}

export async function createTask(dateISO: string, payload: {
  startTime: string
  approxEndTime: string
  description: string
  priority?: "high" | "medium" | "low" | null
  tags?: string[]
  notes?: string | null
  subtasks?: Subtask[]
  links?: { url: string; title: string }[]
  recurrence?: RecurrencePattern
  endDate?: string // ISO date string for multi-day tasks
}, options?: { generateInstances?: boolean; instanceCount?: number }): Promise<Task> {
  const state = await getState()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const task: Task = {
    id,
    startTime: payload.startTime,
    approxEndTime: payload.approxEndTime,
    description: payload.description,
    completed: false,
    priority: payload.priority ?? null,
    tags: payload.tags || [],
    notes: payload.notes ?? null,
    subtasks: payload.subtasks || [],
    links: payload.links,
    recurrence: payload.recurrence,
    endDate: payload.endDate, // Multi-day task end date
  }
  const list = [...(state.tasksByDate[dateISO] || []), task]
  list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
  state.tasksByDate[dateISO] = list

  // Generate recurring instances if requested
  if (payload.recurrence && options?.generateInstances) {
    const instanceCount = options.instanceCount || 30
    const futureDates = generateRecurringDates(payload.recurrence, dateISO, instanceCount + 1)

    // Skip the first date (it's the parent task date)
    for (let i = 1; i < futureDates.length; i++) {
      const instanceDate = futureDates[i]
      const instanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`

      const instanceTask: Task = {
        id: instanceId,
        startTime: payload.startTime,
        approxEndTime: payload.approxEndTime,
        description: payload.description,
        completed: false,
        priority: payload.priority ?? null,
        tags: payload.tags || [],
        notes: payload.notes ?? null,
        subtasks: payload.subtasks?.map(st => ({
          ...st,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          completed: false,
        })) || [],
        links: payload.links,
        parentTaskId: id, // Link to parent task
      }

      const instanceList = [...(state.tasksByDate[instanceDate] || []), instanceTask]
      instanceList.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
      state.tasksByDate[instanceDate] = instanceList
    }
  }

  await saveState(state)
  return task
}

export async function updateTask(
  dateISO: string,
  taskId: string,
  patch: Partial<Pick<Task, 'startTime' | 'approxEndTime' | 'description' | 'completed' | 'actualEndTime' | 'priority' | 'tags' | 'notes' | 'subtasks'>>,
): Promise<Task | null> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []
  const idx = list.findIndex((t) => t.id === taskId)
  if (idx === -1) return null

  let next: Task = { ...list[idx], ...patch }

  // Maintain derived fields when completion or actual end time changes
  if (patch.completed !== undefined) {
    if (patch.completed) {
      const end = next.actualEndTime || nowHMS()
      next.completed = true
      next.actualEndTime = end
      next.durationSeconds = computeDurationSeconds(next.startTime, end)
    } else {
      // Unchecking clears actual end time and duration
      delete next.actualEndTime
      delete next.durationSeconds
      next.completed = false
    }
  }

  if (patch.actualEndTime !== undefined) {
    if (patch.actualEndTime) {
      next.actualEndTime = patch.actualEndTime
      next.durationSeconds = computeDurationSeconds(next.startTime, patch.actualEndTime)
    } else {
      delete next.actualEndTime
      delete next.durationSeconds
    }
  }

  const newList = [...list]
  newList[idx] = next
  // Keep list sorted by start time
  newList.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
  state.tasksByDate[dateISO] = newList
  await saveState(state)
  return next
}

export async function deleteTask(dateISO: string, taskId: string): Promise<boolean> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []
  const newList = list.filter((t) => t.id !== taskId)
  if (newList.length === list.length) return false
  state.tasksByDate[dateISO] = newList
  await saveState(state)
  return true
}

export async function updateCategory(
  dateISO: string,
  key: CategoryKey,
  value: boolean | number,
): Promise<{ dateISO: string; categories: CategoriesByDate[string] }> {
  const state = await getState()
  // Initialize with default values for all habits
  const defaultCategories: Record<string, HabitEntry> = {}
  state.habits.forEach(habit => {
    defaultCategories[habit.id] = getDefaultHabitEntry(habit)
  })
  const current = state.categoriesByDate[dateISO] || defaultCategories

  // Get the habit definition to determine how to handle the value
  const habit = state.habits.find(h => h.id === key)
  let newValue: HabitEntry

  if (habit?.goal && habit.goal > 0) {
    // Goal-based habit - value should be a number
    const numValue = typeof value === 'number' ? value : (value ? habit.goal : 0)
    newValue = { value: numValue, goal: habit.goal }
  } else {
    // Boolean habit
    newValue = typeof value === 'boolean' ? value : value > 0
  }

  const next = { ...current, [key]: newValue }
  state.categoriesByDate[dateISO] = next
  await saveState(state)
  return { dateISO, categories: next }
}

// Increment a habit's value (for goal-based habits)
export async function incrementHabitValue(
  dateISO: string,
  key: CategoryKey,
  amount: number = 1,
): Promise<{ dateISO: string; categories: CategoriesByDate[string] }> {
  const state = await getState()
  const habit = state.habits.find(h => h.id === key)

  if (!habit) {
    throw new Error(`Habit ${key} not found`)
  }

  // Initialize with default values for all habits
  const defaultCategories: Record<string, HabitEntry> = {}
  state.habits.forEach(h => {
    defaultCategories[h.id] = getDefaultHabitEntry(h)
  })
  const current = state.categoriesByDate[dateISO] || defaultCategories
  const currentEntry = current[key]

  let newValue: HabitEntry

  if (habit.goal && habit.goal > 0) {
    // Goal-based habit
    const currentVal = typeof currentEntry === 'object' ? currentEntry.value : 0
    newValue = { value: Math.min(currentVal + amount, habit.goal * 2), goal: habit.goal } // Allow up to 2x goal
  } else {
    // Boolean habit - toggle on increment
    newValue = true
  }

  const next = { ...current, [key]: newValue }
  state.categoriesByDate[dateISO] = next
  await saveState(state)
  return { dateISO, categories: next }
}

// Decrement a habit's value (for goal-based habits)
export async function decrementHabitValue(
  dateISO: string,
  key: CategoryKey,
  amount: number = 1,
): Promise<{ dateISO: string; categories: CategoriesByDate[string] }> {
  const state = await getState()
  const habit = state.habits.find(h => h.id === key)

  if (!habit) {
    throw new Error(`Habit ${key} not found`)
  }

  // Initialize with default values for all habits
  const defaultCategories: Record<string, HabitEntry> = {}
  state.habits.forEach(h => {
    defaultCategories[h.id] = getDefaultHabitEntry(h)
  })
  const current = state.categoriesByDate[dateISO] || defaultCategories
  const currentEntry = current[key]

  let newValue: HabitEntry

  if (habit.goal && habit.goal > 0) {
    // Goal-based habit
    const currentVal = typeof currentEntry === 'object' ? currentEntry.value : 0
    newValue = { value: Math.max(currentVal - amount, 0), goal: habit.goal }
  } else {
    // Boolean habit - toggle off on decrement
    newValue = false
  }

  const next = { ...current, [key]: newValue }
  state.categoriesByDate[dateISO] = next
  await saveState(state)
  return { dateISO, categories: next }
}

// Set a specific numeric value for a goal-based habit
export async function setHabitValue(
  dateISO: string,
  key: CategoryKey,
  value: number,
): Promise<{ dateISO: string; categories: CategoriesByDate[string] }> {
  const state = await getState()
  const habit = state.habits.find(h => h.id === key)

  if (!habit) {
    throw new Error(`Habit ${key} not found`)
  }

  // Initialize with default values for all habits
  const defaultCategories: Record<string, HabitEntry> = {}
  state.habits.forEach(h => {
    defaultCategories[h.id] = getDefaultHabitEntry(h)
  })
  const current = state.categoriesByDate[dateISO] || defaultCategories

  let newValue: HabitEntry

  if (habit.goal && habit.goal > 0) {
    // Goal-based habit
    newValue = { value: Math.max(0, value), goal: habit.goal }
  } else {
    // Boolean habit
    newValue = value > 0
  }

  const next = { ...current, [key]: newValue }
  state.categoriesByDate[dateISO] = next
  await saveState(state)
  return { dateISO, categories: next }
}

// Habit management functions
export async function getHabits(): Promise<HabitDefinition[]> {
  const state = await getState()
  return state.habits
}

export async function addHabit(habit: Omit<HabitDefinition, 'id'>): Promise<HabitDefinition> {
  const state = await getState()

  // Limit to 8 habits
  if (state.habits.length >= 8) {
    throw new Error('Maximum of 8 habits allowed')
  }

  const id = `habit-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const newHabit: HabitDefinition = {
    id,
    name: habit.name,
    color: habit.color,
    icon: habit.icon,
    ...(habit.goal ? { goal: habit.goal } : {}),
  }

  state.habits.push(newHabit)
  await saveState(state)
  return newHabit
}

export async function removeHabit(habitId: string): Promise<boolean> {
  const state = await getState()
  const index = state.habits.findIndex(h => h.id === habitId)

  if (index === -1) return false

  state.habits.splice(index, 1)

  // Remove this habit from all dates' categories
  for (const dateISO in state.categoriesByDate) {
    if (state.categoriesByDate[dateISO][habitId] !== undefined) {
      delete state.categoriesByDate[dateISO][habitId]
    }
  }

  await saveState(state)
  return true
}

export async function updateHabit(habitId: string, updates: Partial<Omit<HabitDefinition, 'id'>>): Promise<HabitDefinition | null> {
  const state = await getState()
  const index = state.habits.findIndex(h => h.id === habitId)

  if (index === -1) return null

  state.habits[index] = {
    ...state.habits[index],
    ...updates,
  }

  await saveState(state)
  return state.habits[index]
}

// Template management functions
export async function getTemplates(): Promise<TaskTemplate[]> {
  const state = await getState()
  return state.templates
}

export async function createTemplate(
  name: string,
  task: Omit<Task, 'id' | 'completed' | 'actualEndTime' | 'durationSeconds'>
): Promise<TaskTemplate> {
  const state = await getState()
  const id = `template-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const template: TaskTemplate = {
    id,
    name,
    task,
  }

  state.templates.push(template)
  await saveState(state)
  return template
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const state = await getState()
  const index = state.templates.findIndex(t => t.id === templateId)

  if (index === -1) return false

  state.templates.splice(index, 1)
  await saveState(state)
  return true
}

export async function createTaskFromTemplate(
  templateId: string,
  dateISO: string
): Promise<Task | null> {
  const state = await getState()
  const template = state.templates.find(t => t.id === templateId)

  if (!template) return null

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const task: Task = {
    id,
    ...template.task,
    completed: false,
  }

  const list = [...(state.tasksByDate[dateISO] || []), task]
  list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
  state.tasksByDate[dateISO] = list
  await saveState(state)
  return task
}

export async function duplicateTask(
  taskId: string,
  fromDate: string,
  toDate: string
): Promise<Task | null> {
  const state = await getState()
  const sourceList = state.tasksByDate[fromDate] || []
  const sourceTask = sourceList.find((t) => t.id === taskId)

  if (!sourceTask) return null

  // Generate new unique id
  const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  // Copy all task properties except id and completion status
  const duplicatedTask: Task = {
    id: newId,
    startTime: sourceTask.startTime,
    approxEndTime: sourceTask.approxEndTime,
    description: sourceTask.description,
    completed: false, // Reset completion status
    priority: sourceTask.priority ?? null,
    tags: sourceTask.tags ? [...sourceTask.tags] : [],
    notes: sourceTask.notes,
    links: sourceTask.links ? [...sourceTask.links] : undefined,
    subtasks: sourceTask.subtasks
      ? sourceTask.subtasks.map(s => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          description: s.description,
          completed: false, // Reset subtask completion
        }))
      : [],
    endDate: sourceTask.endDate, // Preserve multi-day task end date
  }

  // Add to target date's task list
  const targetList = [...(state.tasksByDate[toDate] || []), duplicatedTask]
  targetList.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
  state.tasksByDate[toDate] = targetList

  await saveState(state)
  return duplicatedTask
}

// Bulk operations for tasks
export async function bulkDeleteTasks(dateISO: string, taskIds: string[]): Promise<{ deletedCount: number }> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []
  const taskIdSet = new Set(taskIds)
  const newList = list.filter((t) => !taskIdSet.has(t.id))
  const deletedCount = list.length - newList.length
  state.tasksByDate[dateISO] = newList
  await saveState(state)
  return { deletedCount }
}

export async function bulkCompleteTasks(dateISO: string, taskIds: string[]): Promise<{ completedCount: number }> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []
  const taskIdSet = new Set(taskIds)
  let completedCount = 0

  const newList = list.map((task) => {
    if (taskIdSet.has(task.id) && !task.completed) {
      const end = nowHMS()
      completedCount++
      return {
        ...task,
        completed: true,
        actualEndTime: end,
        durationSeconds: computeDurationSeconds(task.startTime, end),
      }
    }
    return task
  })

  state.tasksByDate[dateISO] = newList
  await saveState(state)
  return { completedCount }
}

export async function bulkMoveTasks(fromDateISO: string, toDateISO: string, taskIds: string[]): Promise<{ movedCount: number }> {
  const state = await getState()
  const fromList = state.tasksByDate[fromDateISO] || []
  const toList = state.tasksByDate[toDateISO] || []
  const taskIdSet = new Set(taskIds)

  const tasksToMove: Task[] = []
  const remainingTasks: Task[] = []

  for (const task of fromList) {
    if (taskIdSet.has(task.id)) {
      // Reset completion status when moving tasks
      tasksToMove.push({
        ...task,
        completed: false,
        actualEndTime: undefined,
        durationSeconds: undefined,
      })
    } else {
      remainingTasks.push(task)
    }
  }

  const newToList = [...toList, ...tasksToMove]
  newToList.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))

  state.tasksByDate[fromDateISO] = remainingTasks
  state.tasksByDate[toDateISO] = newToList
  await saveState(state)
  return { movedCount: tasksToMove.length }
}

export async function bulkDuplicateTasks(dateISO: string, taskIds: string[]): Promise<{ duplicatedTasks: Task[] }> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []
  const taskIdSet = new Set(taskIds)

  const duplicatedTasks: Task[] = []

  for (const task of list) {
    if (taskIdSet.has(task.id)) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const duplicatedTask: Task = {
        ...task,
        id,
        completed: false,
        actualEndTime: undefined,
        durationSeconds: undefined,
        subtasks: task.subtasks?.map(st => ({
          ...st,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          completed: false,
        })) || [],
      }
      duplicatedTasks.push(duplicatedTask)
    }
  }

  const newList = [...list, ...duplicatedTasks]
  newList.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))

  state.tasksByDate[dateISO] = newList
  await saveState(state)
  return { duplicatedTasks }
}

export async function reorderTasks(dateISO: string, taskIds: string[]): Promise<{ tasks: Task[] }> {
  const state = await getState()
  const list = state.tasksByDate[dateISO] || []

  // Create a map of task id to task for quick lookup
  const taskMap = new Map<string, Task>()
  for (const task of list) {
    taskMap.set(task.id, task)
  }

  // Update order based on position in taskIds array
  const reorderedTasks: Task[] = []
  for (let i = 0; i < taskIds.length; i++) {
    const task = taskMap.get(taskIds[i])
    if (task) {
      reorderedTasks.push({
        ...task,
        order: i,
      })
      taskMap.delete(taskIds[i])
    }
  }

  // Add any tasks that weren't in taskIds (shouldn't happen normally)
  for (const [, task] of taskMap) {
    reorderedTasks.push(task)
  }

  state.tasksByDate[dateISO] = reorderedTasks
  await saveState(state)
  return { tasks: reorderedTasks }
}

// Daily Goals management functions
export async function getDailyGoals(): Promise<DailyGoalsConfig> {
  const state = await getState()
  return state.dailyGoals!
}

export async function updateDailyGoals(updates: Partial<DailyGoalsConfig>): Promise<DailyGoalsConfig> {
  const state = await getState()

  if (updates.goals) {
    state.dailyGoals!.goals = updates.goals
  }
  if (updates.lastResetDate) {
    state.dailyGoals!.lastResetDate = updates.lastResetDate
  }

  await saveState(state)
  return state.dailyGoals!
}

export async function updateGoalConfig(
  goalId: string,
  updates: Partial<Pick<DailyGoal, 'target' | 'enabled'>>
): Promise<DailyGoal | null> {
  const state = await getState()
  const goals = state.dailyGoals!.goals
  const index = goals.findIndex(g => g.id === goalId)

  if (index === -1) return null

  goals[index] = { ...goals[index], ...updates }
  await saveState(state)
  return goals[index]
}

export async function calculateGoalProgress(dateISO: string): Promise<DailyGoal[]> {
  const state = await getState()
  const tasks = state.tasksByDate[dateISO] || []
  const goals = state.dailyGoals!.goals

  // Calculate progress for each goal type
  const updatedGoals = goals.map(goal => {
    let current = 0

    switch (goal.type) {
      case 'tasks':
        // Count completed tasks
        current = tasks.filter(t => t.completed).length
        break

      case 'hours':
        // Sum up duration in seconds from completed tasks
        current = tasks
          .filter(t => t.completed && t.durationSeconds)
          .reduce((sum, t) => sum + (t.durationSeconds || 0), 0)
        break

      case 'pomodoros':
        // For now, count completed tasks as a proxy for pomodoros
        // In a real app, this would track actual pomodoro sessions
        current = Math.floor(tasks.filter(t => t.completed).length * 0.5)
        break
    }

    return { ...goal, current }
  })

  // Update state with new progress
  state.dailyGoals!.goals = updatedGoals
  await saveState(state)

  return updatedGoals
}

export async function resetDailyGoals(dateISO: string): Promise<DailyGoalsConfig> {
  const state = await getState()

  // Reset all current values to 0
  state.dailyGoals!.goals = state.dailyGoals!.goals.map(goal => ({
    ...goal,
    current: 0
  }))
  state.dailyGoals!.lastResetDate = dateISO

  await saveState(state)
  return state.dailyGoals!
}

// Increment pomodoro count
export async function incrementPomodoro(): Promise<DailyGoal[]> {
  const state = await getState()
  const goals = state.dailyGoals!.goals

  const pomodoroGoal = goals.find(g => g.type === 'pomodoros')
  if (pomodoroGoal) {
    pomodoroGoal.current += 1
  }

  await saveState(state)
  return state.dailyGoals!.goals
}

