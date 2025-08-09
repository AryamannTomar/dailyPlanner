export type Task = {
  id: string
  startTime: string // "HH:MM" or "HH:MM:SS"
  approxEndTime: string // "HH:MM" or "HH:MM:SS"
  description: string
  completed: boolean
  actualEndTime?: string // set when completed; editable; "HH:MM:SS"
  durationSeconds?: number // auto-computed when completed
}

export type TasksByDate = Record<string, Task[]>

export type CategoryKey = "water" | "meat" | "sleep" | "gym"

export type CategoryState = {
  water: boolean
  meat: boolean
  sleep: boolean
  gym: boolean
}

export type CategoriesByDate = Record<string, CategoryState>

export type FilterMode = "tasks" | "water" | "meat" | "sleep" | "gym" | "all"
