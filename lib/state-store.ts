import { promises as fs } from 'fs'
import path from 'path'
import type { Task, TasksByDate, CategoriesByDate, CategoryKey } from '@/lib/types'
import { computeDurationSeconds, nowHMS } from '@/lib/time-utils'

export type AppState = {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
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
  if (existing) return existing
  return { tasksByDate: {}, categoriesByDate: {} }
}

export async function saveState(state: AppState): Promise<void> {
  await writeRaw(state)
}

export async function createTask(dateISO: string, payload: {
  startTime: string
  approxEndTime: string
  description: string
}): Promise<Task> {
  const state = await getState()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const task: Task = {
    id,
    startTime: payload.startTime,
    approxEndTime: payload.approxEndTime,
    description: payload.description,
    completed: false,
  }
  const list = [...(state.tasksByDate[dateISO] || []), task]
  list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
  state.tasksByDate[dateISO] = list
  await saveState(state)
  return task
}

export async function updateTask(
  dateISO: string,
  taskId: string,
  patch: Partial<Pick<Task, 'startTime' | 'approxEndTime' | 'description' | 'completed' | 'actualEndTime'>>,
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
  value: boolean,
): Promise<{ dateISO: string; categories: CategoriesByDate[string] }> {
  const state = await getState()
  const current = state.categoriesByDate[dateISO] || { water: false, meat: false, sleep: false, gym: false }
  const next = { ...current, [key]: value }
  state.categoriesByDate[dateISO] = next
  await saveState(state)
  return { dateISO, categories: next }
}


