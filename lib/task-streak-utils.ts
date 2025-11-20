import type { TasksByDate, Task } from '@/lib/types'

export type TaskStreakData = {
  current: number
  longest: number
  lastCompletedDate: string | null
  atRisk: boolean // true if today has incomplete tasks
  streakStartDate: string | null
}

export type ProductivityStreakData = {
  current: number
  longest: number
  lastQualifyingDate: string | null
}

export type StreakHistoryEntry = {
  date: string
  allCompleted: boolean
  completedCount: number
  totalCount: number
  isStreakDay: boolean
  isFreezeDay: boolean
}

export type StreakBadge = {
  id: string
  name: string
  description: string
  icon: string
  requirement: number
  earned: boolean
  earnedDate?: string
}

export type StreakFreezeData = {
  available: number
  maxPerMonth: number
  usedThisMonth: number
  usedDates: string[]
}

// Streak milestone thresholds
export const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365]

// Badge definitions
export const STREAK_BADGES: Omit<StreakBadge, 'earned' | 'earnedDate'>[] = [
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Complete all tasks for 7 consecutive days',
    icon: 'shield',
    requirement: 7,
  },
  {
    id: 'fortnight-fighter',
    name: 'Fortnight Fighter',
    description: 'Complete all tasks for 14 consecutive days',
    icon: 'swords',
    requirement: 14,
  },
  {
    id: 'monthly-master',
    name: 'Monthly Master',
    description: 'Complete all tasks for 30 consecutive days',
    icon: 'crown',
    requirement: 30,
  },
  {
    id: 'consistency-champion',
    name: 'Consistency Champion',
    description: 'Complete all tasks for 60 consecutive days',
    icon: 'medal',
    requirement: 60,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete all tasks for 100 consecutive days',
    icon: 'star',
    requirement: 100,
  },
  {
    id: 'year-legend',
    name: 'Year Legend',
    description: 'Complete all tasks for 365 consecutive days',
    icon: 'trophy',
    requirement: 365,
  },
]

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse ISO date string to Date object
 */
function parseISODate(dateISO: string): Date {
  return new Date(dateISO + 'T00:00:00')
}

/**
 * Check if all tasks are completed for a given date
 */
function areAllTasksCompleted(dateISO: string, tasksByDate: TasksByDate): boolean {
  const tasks = tasksByDate[dateISO]
  if (!tasks || tasks.length === 0) return false
  return tasks.every((task) => task.completed)
}

/**
 * Check if at least minTasks are completed for a given date
 */
function hasMinTasksCompleted(
  dateISO: string,
  tasksByDate: TasksByDate,
  minTasks: number
): boolean {
  const tasks = tasksByDate[dateISO]
  if (!tasks || tasks.length === 0) return false
  const completedCount = tasks.filter((task) => task.completed).length
  return completedCount >= minTasks
}

/**
 * Get the number of completed tasks for a date
 */
function getCompletedTaskCount(dateISO: string, tasksByDate: TasksByDate): number {
  const tasks = tasksByDate[dateISO]
  if (!tasks) return 0
  return tasks.filter((task) => task.completed).length
}

/**
 * Get the total number of tasks for a date
 */
function getTotalTaskCount(dateISO: string, tasksByDate: TasksByDate): number {
  const tasks = tasksByDate[dateISO]
  return tasks?.length || 0
}

/**
 * Calculate the current task completion streak
 * Counts consecutive days starting from today going backwards where all tasks are completed
 */
export function calculateTaskStreak(
  tasksByDate: TasksByDate,
  freezeData?: StreakFreezeData
): TaskStreakData {
  const today = new Date()
  const todayISO = formatDateISO(today)
  let streak = 0
  let currentDate = new Date(today)
  let lastCompletedDate: string | null = null
  let streakStartDate: string | null = null
  let consecutiveFreezes = 0
  const maxConsecutiveFreezes = 1 // Only allow one freeze in a row

  // Check if today's tasks are at risk (incomplete)
  const todayTasks = tasksByDate[todayISO] || []
  const atRisk = todayTasks.length > 0 && !todayTasks.every((t) => t.completed)

  // Start from today and go backwards
  while (true) {
    const dateISO = formatDateISO(currentDate)
    const tasks = tasksByDate[dateISO]

    // If date has tasks and all are completed
    if (tasks && tasks.length > 0 && areAllTasksCompleted(dateISO, tasksByDate)) {
      streak++
      lastCompletedDate = lastCompletedDate || dateISO
      streakStartDate = dateISO
      consecutiveFreezes = 0
      currentDate.setDate(currentDate.getDate() - 1)
    }
    // If date is a freeze day
    else if (freezeData && freezeData.usedDates.includes(dateISO) && consecutiveFreezes < maxConsecutiveFreezes) {
      consecutiveFreezes++
      currentDate.setDate(currentDate.getDate() - 1)
    }
    // If no tasks on this day, check if we should continue counting
    else if (!tasks || tasks.length === 0) {
      // Skip days with no tasks for the first day (today), but continue checking
      if (streak === 0) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = formatDateISO(yesterday)

        if (areAllTasksCompleted(yesterdayISO, tasksByDate)) {
          currentDate = yesterday
          continue
        }
      }
      break
    }
    else {
      // Tasks exist but not all completed
      if (streak === 0) {
        // If today is not complete, check if yesterday started a streak
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = formatDateISO(yesterday)

        if (areAllTasksCompleted(yesterdayISO, tasksByDate)) {
          currentDate = yesterday
          continue
        }
      }
      break
    }
  }

  return {
    current: streak,
    longest: calculateLongestTaskStreak(tasksByDate, freezeData),
    lastCompletedDate,
    atRisk,
    streakStartDate,
  }
}

/**
 * Calculate the longest task completion streak across all available data
 */
export function calculateLongestTaskStreak(
  tasksByDate: TasksByDate,
  freezeData?: StreakFreezeData
): number {
  // Get all dates and sort them
  const dates = Object.keys(tasksByDate).sort()

  if (dates.length === 0) return 0

  let longestStreak = 0
  let currentStreak = 0
  let previousDate: Date | null = null
  let consecutiveFreezes = 0
  const maxConsecutiveFreezes = 1

  for (const dateISO of dates) {
    const currentDate = parseISODate(dateISO)
    const tasks = tasksByDate[dateISO]

    // Skip dates with no tasks
    if (!tasks || tasks.length === 0) {
      if (currentStreak > 0 && previousDate) {
        // Check for freeze days
        if (freezeData && freezeData.usedDates.includes(dateISO) && consecutiveFreezes < maxConsecutiveFreezes) {
          consecutiveFreezes++
          continue
        }
      }
      currentStreak = 0
      previousDate = null
      consecutiveFreezes = 0
      continue
    }

    if (areAllTasksCompleted(dateISO, tasksByDate)) {
      // Check if this date is consecutive to the previous date
      if (previousDate) {
        const daysDiff = Math.round(
          (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysDiff === 1) {
          currentStreak++
        } else if (daysDiff <= 2 && freezeData) {
          // Check if there's a freeze in between
          const betweenDate = new Date(previousDate)
          betweenDate.setDate(betweenDate.getDate() + 1)
          const betweenISO = formatDateISO(betweenDate)
          if (freezeData.usedDates.includes(betweenISO)) {
            currentStreak++
          } else {
            currentStreak = 1
          }
        } else {
          // Gap in dates, reset streak
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }

      longestStreak = Math.max(longestStreak, currentStreak)
      previousDate = currentDate
      consecutiveFreezes = 0
    } else {
      // Not all tasks completed, reset streak
      currentStreak = 0
      previousDate = null
      consecutiveFreezes = 0
    }
  }

  return longestStreak
}

/**
 * Calculate productivity streak - consecutive days with at least X tasks completed
 */
export function calculateProductivityStreak(
  tasksByDate: TasksByDate,
  minTasks: number = 1
): ProductivityStreakData {
  const today = new Date()
  let streak = 0
  let currentDate = new Date(today)
  let lastQualifyingDate: string | null = null

  // Start from today and go backwards
  while (true) {
    const dateISO = formatDateISO(currentDate)
    const tasks = tasksByDate[dateISO]

    // Skip dates with no tasks
    if (!tasks || tasks.length === 0) {
      if (streak === 0) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = formatDateISO(yesterday)

        if (hasMinTasksCompleted(yesterdayISO, tasksByDate, minTasks)) {
          currentDate = yesterday
          continue
        }
      }
      break
    }

    if (hasMinTasksCompleted(dateISO, tasksByDate, minTasks)) {
      streak++
      lastQualifyingDate = lastQualifyingDate || dateISO
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      if (streak === 0) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = formatDateISO(yesterday)

        if (hasMinTasksCompleted(yesterdayISO, tasksByDate, minTasks)) {
          currentDate = yesterday
          continue
        }
      }
      break
    }
  }

  // Calculate longest productivity streak
  const dates = Object.keys(tasksByDate).sort()
  let longestStreak = 0
  let currentLongest = 0
  let previousDate: Date | null = null

  for (const dateISO of dates) {
    const currentDateObj = parseISODate(dateISO)
    const tasks = tasksByDate[dateISO]

    if (!tasks || tasks.length === 0) {
      currentLongest = 0
      previousDate = null
      continue
    }

    if (hasMinTasksCompleted(dateISO, tasksByDate, minTasks)) {
      if (previousDate) {
        const daysDiff = Math.round(
          (currentDateObj.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysDiff === 1) {
          currentLongest++
        } else {
          currentLongest = 1
        }
      } else {
        currentLongest = 1
      }
      longestStreak = Math.max(longestStreak, currentLongest)
      previousDate = currentDateObj
    } else {
      currentLongest = 0
      previousDate = null
    }
  }

  return {
    current: streak,
    longest: longestStreak,
    lastQualifyingDate,
  }
}

/**
 * Get streak history data for visualization (e.g., calendar heatmap)
 */
export function getStreakHistory(
  tasksByDate: TasksByDate,
  freezeData?: StreakFreezeData,
  days: number = 90
): StreakHistoryEntry[] {
  const history: StreakHistoryEntry[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateISO = formatDateISO(date)

    const tasks = tasksByDate[dateISO] || []
    const completedCount = tasks.filter((t) => t.completed).length
    const totalCount = tasks.length
    const allCompleted = totalCount > 0 && completedCount === totalCount
    const isFreezeDay = freezeData?.usedDates.includes(dateISO) || false

    history.push({
      date: dateISO,
      allCompleted,
      completedCount,
      totalCount,
      isStreakDay: allCompleted || isFreezeDay,
      isFreezeDay,
    })
  }

  return history
}

/**
 * Check if streak has hit a milestone
 */
export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak)
}

/**
 * Get milestone message for a given streak
 */
export function getStreakMilestoneMessage(streak: number): string {
  switch (streak) {
    case 7:
      return "1 Week Streak!"
    case 14:
      return "2 Week Streak!"
    case 30:
      return "1 Month Streak!"
    case 60:
      return "2 Month Streak!"
    case 100:
      return "100 Day Streak!"
    case 365:
      return "1 Year Streak!"
    default:
      return `${streak} Day Streak!`
  }
}

/**
 * Get earned badges based on current and longest streaks
 */
export function getEarnedBadges(
  tasksByDate: TasksByDate,
  freezeData?: StreakFreezeData
): StreakBadge[] {
  const { longest } = calculateTaskStreak(tasksByDate, freezeData)

  return STREAK_BADGES.map((badge) => ({
    ...badge,
    earned: longest >= badge.requirement,
  }))
}

/**
 * Get motivational message based on streak length
 */
export function getTaskStreakMessage(streak: number): string {
  if (streak === 0) return "Start your task streak today!"
  if (streak === 1) return "Great start! Keep it going!"
  if (streak < 3) return "Building momentum!"
  if (streak < 7) return "You're on fire!"
  if (streak < 14) return "One week strong!"
  if (streak < 30) return "Two weeks and counting!"
  if (streak < 60) return "One month champion!"
  if (streak < 100) return "Incredible dedication!"
  return "Legendary streak!"
}

/**
 * Get streak color based on length
 */
export function getTaskStreakColor(streak: number): string {
  if (streak >= 100) return 'text-amber-500'
  if (streak >= 30) return 'text-purple-500'
  if (streak >= 7) return 'text-red-500'
  if (streak >= 3) return 'text-orange-500'
  if (streak >= 1) return 'text-yellow-500'
  return 'text-muted-foreground'
}

/**
 * Get streak glow/shadow color for visual effect
 */
export function getTaskStreakGlowColor(streak: number): string {
  if (streak >= 100) return 'shadow-amber-500/50'
  if (streak >= 30) return 'shadow-purple-500/50'
  if (streak >= 7) return 'shadow-red-500/50'
  if (streak >= 3) return 'shadow-orange-500/50'
  if (streak >= 1) return 'shadow-yellow-500/50'
  return ''
}

/**
 * Get streak intensity for color scaling (0-1)
 */
export function getStreakIntensity(streak: number): number {
  if (streak === 0) return 0
  if (streak >= 100) return 1
  return Math.min(streak / 100, 1)
}

/**
 * Calculate streak freeze data
 */
export function calculateStreakFreezeData(
  usedFreezes: string[] = [],
  maxPerMonth: number = 2
): StreakFreezeData {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Count freezes used this month
  const usedThisMonth = usedFreezes.filter((dateISO) => {
    const date = parseISODate(dateISO)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  }).length

  return {
    available: Math.max(0, maxPerMonth - usedThisMonth),
    maxPerMonth,
    usedThisMonth,
    usedDates: usedFreezes,
  }
}

/**
 * Check if using a freeze today would be valid
 */
export function canUseFreeze(freezeData: StreakFreezeData): boolean {
  return freezeData.available > 0
}

/**
 * Get the next milestone the user is working towards
 */
export function getNextMilestone(currentStreak: number): number | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone) {
      return milestone
    }
  }
  return null
}

/**
 * Get progress towards the next milestone
 */
export function getMilestoneProgress(currentStreak: number): {
  nextMilestone: number | null
  progress: number
  daysRemaining: number
} {
  const nextMilestone = getNextMilestone(currentStreak)

  if (nextMilestone === null) {
    return {
      nextMilestone: null,
      progress: 100,
      daysRemaining: 0,
    }
  }

  // Find previous milestone
  const previousMilestones = STREAK_MILESTONES.filter((m) => m < nextMilestone)
  const previousMilestone = previousMilestones.length > 0
    ? previousMilestones[previousMilestones.length - 1]
    : 0

  const progress = Math.round(
    ((currentStreak - previousMilestone) / (nextMilestone - previousMilestone)) * 100
  )

  return {
    nextMilestone,
    progress: Math.min(100, Math.max(0, progress)),
    daysRemaining: nextMilestone - currentStreak,
  }
}

/**
 * Check if today's tasks are complete
 */
export function areTodayTasksComplete(tasksByDate: TasksByDate): boolean {
  const today = formatDateISO(new Date())
  return areAllTasksCompleted(today, tasksByDate)
}

/**
 * Get today's task completion status
 */
export function getTodayTaskStatus(tasksByDate: TasksByDate): {
  completed: number
  total: number
  allDone: boolean
} {
  const today = formatDateISO(new Date())
  const tasks = tasksByDate[today] || []
  const completed = tasks.filter((t) => t.completed).length

  return {
    completed,
    total: tasks.length,
    allDone: tasks.length > 0 && completed === tasks.length,
  }
}
