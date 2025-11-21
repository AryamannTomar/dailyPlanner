// Break Reminder Types and Utilities

export type ReminderType = 'notification' | 'modal'

export type BreakActivity = 'stretch' | 'water' | 'rest' | 'walk' | 'eyes'

export type BreakReminderSettings = {
  enabled: boolean
  intervalMinutes: number // default: 50
  reminderType: ReminderType
  quietHoursStart: string // "HH:MM" format
  quietHoursEnd: string // "HH:MM" format
  quietHoursEnabled: boolean
  selectedActivities: BreakActivity[]
}

export type BreakRecord = {
  id: string
  timestamp: string // ISO date string
  duration: number // break duration in seconds
  activity?: BreakActivity
  workTimeBefore: number // work time in seconds before this break
}

export type BreakHistory = {
  breaks: BreakRecord[]
  lastBreakTime: string | null // ISO date string
}

export type BreakStats = {
  totalBreaksToday: number
  totalBreakTimeToday: number // in seconds
  averageWorkInterval: number // in seconds
  longestWorkStreak: number // in seconds
}

// Default settings
export const DEFAULT_BREAK_SETTINGS: BreakReminderSettings = {
  enabled: true,
  intervalMinutes: 50,
  reminderType: 'modal',
  quietHoursStart: '12:00',
  quietHoursEnd: '13:00',
  quietHoursEnabled: false,
  selectedActivities: ['stretch', 'water', 'rest'],
}

// Break activity suggestions
export const BREAK_ACTIVITIES: Record<BreakActivity, { label: string; description: string; icon: string }> = {
  stretch: {
    label: 'Stretch',
    description: 'Stand up and stretch your muscles',
    icon: 'Flame',
  },
  water: {
    label: 'Drink Water',
    description: 'Stay hydrated with a glass of water',
    icon: 'Droplets',
  },
  rest: {
    label: 'Rest Eyes',
    description: 'Look at something 20 feet away for 20 seconds',
    icon: 'Eye',
  },
  walk: {
    label: 'Take a Walk',
    description: 'Walk around for a few minutes',
    icon: 'Footprints',
  },
  eyes: {
    label: 'Close Eyes',
    description: 'Close your eyes and relax for a moment',
    icon: 'Moon',
  },
}

// LocalStorage keys
const STORAGE_KEYS = {
  settings: 'breakReminderSettings',
  history: 'breakHistory',
  lastActivity: 'lastActivityTime',
  workStartTime: 'workStartTime',
  snoozedUntil: 'breakReminderSnoozedUntil',
}

// Settings management
export function getBreakSettings(): BreakReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_BREAK_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings)
    if (stored) {
      return { ...DEFAULT_BREAK_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load break settings:', error)
  }

  return DEFAULT_BREAK_SETTINGS
}

export function saveBreakSettings(settings: BreakReminderSettings): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save break settings:', error)
  }
}

// Break history management
export function getBreakHistory(): BreakHistory {
  if (typeof window === 'undefined') return { breaks: [], lastBreakTime: null }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.history)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load break history:', error)
  }

  return { breaks: [], lastBreakTime: null }
}

export function saveBreakHistory(history: BreakHistory): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history))
  } catch (error) {
    console.error('Failed to save break history:', error)
  }
}

export function logBreak(duration: number, activity?: BreakActivity, workTimeBefore?: number): void {
  const history = getBreakHistory()
  const now = new Date().toISOString()

  const breakRecord: BreakRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: now,
    duration,
    activity,
    workTimeBefore: workTimeBefore || 0,
  }

  history.breaks.push(breakRecord)
  history.lastBreakTime = now

  // Keep only last 30 days of history
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  history.breaks = history.breaks.filter(
    b => new Date(b.timestamp) > thirtyDaysAgo
  )

  saveBreakHistory(history)
}

// Activity tracking
export function getLastActivityTime(): number {
  if (typeof window === 'undefined') return Date.now()

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.lastActivity)
    return stored ? parseInt(stored, 10) : Date.now()
  } catch {
    return Date.now()
  }
}

export function updateLastActivityTime(): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEYS.lastActivity, Date.now().toString())
}

export function getWorkStartTime(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.workStartTime)
    return stored ? parseInt(stored, 10) : null
  } catch {
    return null
  }
}

export function setWorkStartTime(time: number): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEYS.workStartTime, time.toString())
}

export function resetWorkStartTime(): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEYS.workStartTime, Date.now().toString())
}

// Snooze management
export function getSnoozedUntil(): number | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.snoozedUntil)
    if (stored) {
      const time = parseInt(stored, 10)
      // Clear if snooze has expired
      if (time < Date.now()) {
        localStorage.removeItem(STORAGE_KEYS.snoozedUntil)
        return null
      }
      return time
    }
  } catch {
    return null
  }

  return null
}

export function snoozeReminder(minutes: number): void {
  if (typeof window === 'undefined') return

  const snoozedUntil = Date.now() + minutes * 60 * 1000
  localStorage.setItem(STORAGE_KEYS.snoozedUntil, snoozedUntil.toString())
}

export function clearSnooze(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(STORAGE_KEYS.snoozedUntil)
}

// Time utilities
export function isInQuietHours(settings: BreakReminderSettings): boolean {
  if (!settings.quietHoursEnabled) return false

  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number)
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number)

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  // Handle overnight quiet hours (e.g., 22:00 - 06:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime
  }

  return currentTime >= startTime && currentTime < endTime
}

export function shouldShowReminder(settings: BreakReminderSettings): boolean {
  if (!settings.enabled) return false
  if (isInQuietHours(settings)) return false
  if (getSnoozedUntil() !== null) return false

  return true
}

export function getTimeSinceLastBreak(): number {
  const history = getBreakHistory()
  if (!history.lastBreakTime) {
    // If no break recorded, use work start time or current time
    const workStart = getWorkStartTime()
    return workStart ? Date.now() - workStart : 0
  }

  return Date.now() - new Date(history.lastBreakTime).getTime()
}

export function getWorkTimeDisplay(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`
}

// Break statistics
export function getTodayBreakStats(): BreakStats {
  const history = getBreakHistory()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayBreaks = history.breaks.filter(b => {
    const breakDate = new Date(b.timestamp)
    breakDate.setHours(0, 0, 0, 0)
    return breakDate.getTime() === today.getTime()
  })

  const totalBreaksToday = todayBreaks.length
  const totalBreakTimeToday = todayBreaks.reduce((sum, b) => sum + b.duration, 0)

  // Calculate average work interval
  const workIntervals = todayBreaks.map(b => b.workTimeBefore).filter(t => t > 0)
  const averageWorkInterval = workIntervals.length > 0
    ? workIntervals.reduce((sum, t) => sum + t, 0) / workIntervals.length
    : 0

  // Calculate longest work streak
  const longestWorkStreak = workIntervals.length > 0
    ? Math.max(...workIntervals)
    : 0

  return {
    totalBreaksToday,
    totalBreakTimeToday,
    averageWorkInterval,
    longestWorkStreak,
  }
}

export function getWeeklyBreakStats(): { day: string; breaks: number; workTime: number }[] {
  const history = getBreakHistory()
  const stats: { day: string; breaks: number; workTime: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const dayBreaks = history.breaks.filter(b => {
      const breakDate = new Date(b.timestamp)
      breakDate.setHours(0, 0, 0, 0)
      return breakDate.getTime() === date.getTime()
    })

    stats.push({
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      breaks: dayBreaks.length,
      workTime: dayBreaks.reduce((sum, b) => sum + b.workTimeBefore, 0),
    })
  }

  return stats
}

// Motivational messages
export function getBreakMotivation(): string {
  const messages = [
    "Time for a well-deserved break!",
    "Your body will thank you for this break.",
    "Step away and recharge your mind.",
    "A short break boosts productivity.",
    "Your eyes need a rest from the screen.",
    "Stand up and stretch those muscles!",
    "Hydration check - time for water!",
    "Take a moment to breathe deeply.",
    "Your future self will thank you for this break.",
    "A refreshed mind is a productive mind.",
  ]

  return messages[Math.floor(Math.random() * messages.length)]
}

export function getRandomActivity(settings: BreakReminderSettings): BreakActivity {
  const activities = settings.selectedActivities.length > 0
    ? settings.selectedActivities
    : ['stretch', 'water', 'rest'] as BreakActivity[]

  return activities[Math.floor(Math.random() * activities.length)]
}
