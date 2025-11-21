// Pomodoro Timer Types and Utilities

export type PomodoroSessionType = 'work' | 'shortBreak' | 'longBreak'

export type PomodoroState = 'idle' | 'running' | 'paused' | 'completed'

export type PomodoroSettings = {
  workDuration: number // in minutes
  shortBreakDuration: number // in minutes
  longBreakDuration: number // in minutes
  sessionsBeforeLongBreak: number
  autoStartBreaks: boolean
  autoStartWork: boolean
  soundEnabled: boolean
  volume: number // 0-100
}

export type PomodoroSession = {
  id: string
  type: PomodoroSessionType
  startTime: Date
  endTime?: Date
  duration: number // in seconds
  completed: boolean
  taskId?: string // optional link to a task
  taskDescription?: string
}

export type PomodoroStats = {
  today: {
    workSessions: number
    totalWorkMinutes: number
    breaks: number
  }
  week: {
    workSessions: number
    totalWorkMinutes: number
    breaks: number
  }
  currentStreak: number // consecutive days with at least one session
}

export type PomodoroTimerState = {
  state: PomodoroState
  sessionType: PomodoroSessionType
  timeRemaining: number // in seconds
  totalTime: number // in seconds
  sessionsCompleted: number
  currentTaskId?: string
  currentTaskDescription?: string
}

// Default settings
export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  volume: 50,
}

// Storage keys
const STORAGE_KEYS = {
  settings: 'pomodoro-settings',
  sessions: 'pomodoro-sessions',
  stats: 'pomodoro-stats',
}

// Load settings from localStorage
export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === 'undefined') return DEFAULT_POMODORO_SETTINGS

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings)
    if (stored) {
      return { ...DEFAULT_POMODORO_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load Pomodoro settings:', error)
  }

  return DEFAULT_POMODORO_SETTINGS
}

// Save settings to localStorage
export function savePomodoroSettings(settings: PomodoroSettings): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  } catch (error) {
    console.error('Failed to save Pomodoro settings:', error)
  }
}

// Load sessions from localStorage
export function loadPomodoroSessions(): PomodoroSession[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.sessions)
    if (stored) {
      const sessions = JSON.parse(stored)
      return sessions.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: s.endTime ? new Date(s.endTime) : undefined,
      }))
    }
  } catch (error) {
    console.error('Failed to load Pomodoro sessions:', error)
  }

  return []
}

// Save sessions to localStorage
export function savePomodoroSessions(sessions: PomodoroSession[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions))
  } catch (error) {
    console.error('Failed to save Pomodoro sessions:', error)
  }
}

// Add a completed session
export function addPomodoroSession(
  session: Omit<PomodoroSession, 'id' | 'startTime' | 'endTime'>
): PomodoroSession {
  const sessions = loadPomodoroSessions()

  const newSession: PomodoroSession = {
    ...session,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    startTime: new Date(Date.now() - session.duration * 1000),
    endTime: new Date(),
  }

  sessions.push(newSession)

  // Keep only last 30 days of sessions
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const filteredSessions = sessions.filter(s => s.startTime >= thirtyDaysAgo)

  savePomodoroSessions(filteredSessions)

  return newSession
}

// Get Pomodoro statistics
export function getPomodoroStats(): PomodoroStats {
  const sessions = loadPomodoroSessions()
  const now = new Date()

  // Today's stats
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todaySessions = sessions.filter(s => s.startTime >= todayStart)
  const todayWorkSessions = todaySessions.filter(s => s.type === 'work' && s.completed)

  // Week's stats (last 7 days)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)
  const weekSessions = sessions.filter(s => s.startTime >= weekStart)
  const weekWorkSessions = weekSessions.filter(s => s.type === 'work' && s.completed)

  // Calculate streak (consecutive days with at least one completed work session)
  let streak = 0
  const checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  while (true) {
    const dayStart = new Date(checkDate)
    const dayEnd = new Date(checkDate)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const hasSessions = sessions.some(
      s => s.type === 'work' && s.completed && s.startTime >= dayStart && s.startTime < dayEnd
    )

    if (hasSessions) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    today: {
      workSessions: todayWorkSessions.length,
      totalWorkMinutes: Math.round(
        todayWorkSessions.reduce((acc, s) => acc + s.duration, 0) / 60
      ),
      breaks: todaySessions.filter(s => s.type !== 'work' && s.completed).length,
    },
    week: {
      workSessions: weekWorkSessions.length,
      totalWorkMinutes: Math.round(
        weekWorkSessions.reduce((acc, s) => acc + s.duration, 0) / 60
      ),
      breaks: weekSessions.filter(s => s.type !== 'work' && s.completed).length,
    },
    currentStreak: streak,
  }
}

// Get sessions for a specific task
export function getTaskPomodoroSessions(taskId: string): PomodoroSession[] {
  const sessions = loadPomodoroSessions()
  return sessions.filter(s => s.taskId === taskId && s.type === 'work' && s.completed)
}

// Format time remaining as MM:SS
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Get duration in seconds for a session type
export function getSessionDuration(
  type: PomodoroSessionType,
  settings: PomodoroSettings
): number {
  switch (type) {
    case 'work':
      return settings.workDuration * 60
    case 'shortBreak':
      return settings.shortBreakDuration * 60
    case 'longBreak':
      return settings.longBreakDuration * 60
    default:
      return settings.workDuration * 60
  }
}

// Get the next session type based on completed sessions
export function getNextSessionType(
  currentType: PomodoroSessionType,
  sessionsCompleted: number,
  settings: PomodoroSettings
): PomodoroSessionType {
  if (currentType === 'work') {
    // After work, take a break
    if ((sessionsCompleted + 1) % settings.sessionsBeforeLongBreak === 0) {
      return 'longBreak'
    }
    return 'shortBreak'
  }
  // After break, work again
  return 'work'
}

// Get session type label
export function getSessionTypeLabel(type: PomodoroSessionType): string {
  switch (type) {
    case 'work':
      return 'Work'
    case 'shortBreak':
      return 'Short Break'
    case 'longBreak':
      return 'Long Break'
    default:
      return 'Work'
  }
}

// Get session type color
export function getSessionTypeColor(type: PomodoroSessionType): string {
  switch (type) {
    case 'work':
      return 'text-red-500'
    case 'shortBreak':
      return 'text-green-500'
    case 'longBreak':
      return 'text-blue-500'
    default:
      return 'text-red-500'
  }
}

// Get session type background color
export function getSessionTypeBgColor(type: PomodoroSessionType): string {
  switch (type) {
    case 'work':
      return 'bg-red-500'
    case 'shortBreak':
      return 'bg-green-500'
    case 'longBreak':
      return 'bg-blue-500'
    default:
      return 'bg-red-500'
  }
}

// Play notification sound
export function playNotificationSound(volume: number = 50): void {
  if (typeof window === 'undefined') return

  try {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.value = volume / 100

    oscillator.start()

    // Play a pleasant two-tone notification
    setTimeout(() => {
      oscillator.frequency.value = 1000
    }, 150)

    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 300)
  } catch (error) {
    console.error('Failed to play notification sound:', error)
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false

  if (Notification.permission === 'granted') return true

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

// Show browser notification
export function showBrowserNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      ...options,
    })
  }
}
