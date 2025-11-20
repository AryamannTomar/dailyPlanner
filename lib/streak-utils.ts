import type { CategoryState, CategoryKey, HabitDefinition, CategoriesByDate } from '@/lib/types'
import { isHabitCompleted } from '@/lib/types'

export type HabitStreak = {
  current: number
  longest: number
  lastCompletedDate: string | null
}

export type AllHabitStreaks = Record<string, HabitStreak>

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
 * Check if a habit was completed on a given date
 */
function isHabitDone(
  habitKey: CategoryKey,
  dateISO: string,
  categoriesByDate: CategoriesByDate
): boolean {
  const categories = categoriesByDate[dateISO]
  if (!categories) return false
  const entry = categories[habitKey]
  if (entry === undefined) return false
  return isHabitCompleted(entry)
}

/**
 * Calculate the current streak for a habit
 * Counts consecutive days starting from today going backwards
 */
export function calculateStreak(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): number {
  const today = new Date()
  let streak = 0
  let currentDate = new Date(today)

  // Start from today and go backwards
  while (true) {
    const dateISO = formatDateISO(currentDate)

    if (isHabitDone(habitKey, dateISO, categoriesByDate)) {
      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      // If today is not done but yesterday was, start counting from yesterday
      if (streak === 0) {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayISO = formatDateISO(yesterday)

        if (isHabitDone(habitKey, yesterdayISO, categoriesByDate)) {
          currentDate = yesterday
          continue
        }
      }
      break
    }
  }

  return streak
}

/**
 * Calculate the longest streak for a habit across all available data
 */
export function calculateLongestStreak(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): number {
  // Get all dates and sort them
  const dates = Object.keys(categoriesByDate).sort()

  if (dates.length === 0) return 0

  let longestStreak = 0
  let currentStreak = 0
  let previousDate: Date | null = null

  for (const dateISO of dates) {
    const currentDate = new Date(dateISO + 'T00:00:00')

    if (isHabitDone(habitKey, dateISO, categoriesByDate)) {
      // Check if this date is consecutive to the previous date
      if (previousDate) {
        const daysDiff = Math.round(
          (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysDiff === 1) {
          currentStreak++
        } else {
          // Gap in dates, reset streak
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }

      longestStreak = Math.max(longestStreak, currentStreak)
      previousDate = currentDate
    } else {
      // Habit not done, reset streak
      currentStreak = 0
      previousDate = null
    }
  }

  return longestStreak
}

/**
 * Get the last date when a habit was completed
 */
export function getLastCompletedDate(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): string | null {
  const dates = Object.keys(categoriesByDate).sort().reverse()

  for (const dateISO of dates) {
    if (isHabitDone(habitKey, dateISO, categoriesByDate)) {
      return dateISO
    }
  }

  return null
}

/**
 * Calculate all streak information for a single habit
 */
export function calculateHabitStreak(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): HabitStreak {
  return {
    current: calculateStreak(habitKey, categoriesByDate),
    longest: calculateLongestStreak(habitKey, categoriesByDate),
    lastCompletedDate: getLastCompletedDate(habitKey, categoriesByDate),
  }
}

/**
 * Calculate all streak information for all habits
 */
export function calculateAllStreaks(
  habits: HabitDefinition[],
  categoriesByDate: CategoriesByDate
): AllHabitStreaks {
  const streaks: AllHabitStreaks = {}

  for (const habit of habits) {
    streaks[habit.id] = calculateHabitStreak(habit.id, categoriesByDate)
  }

  return streaks
}

/**
 * Get motivational message based on streak length
 */
export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your streak today!"
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
export function getStreakColor(streak: number): string {
  if (streak >= 30) return 'text-purple-500'
  if (streak >= 7) return 'text-red-500'
  if (streak >= 3) return 'text-orange-500'
  if (streak >= 1) return 'text-yellow-500'
  return 'text-muted-foreground'
}

/**
 * Get streak background color for glow effect
 */
export function getStreakGlowColor(streak: number): string {
  if (streak >= 30) return 'shadow-purple-500/50'
  if (streak >= 7) return 'shadow-red-500/50'
  if (streak >= 3) return 'shadow-orange-500/50'
  if (streak >= 1) return 'shadow-yellow-500/50'
  return ''
}

/**
 * Check if streak has hit a milestone
 */
export function isStreakMilestone(streak: number): boolean {
  return [7, 14, 30, 60, 100].includes(streak)
}

/**
 * Get milestone message
 */
export function getMilestoneMessage(streak: number): string {
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
    default:
      return ""
  }
}

/**
 * Check if completing a habit today would continue a streak
 */
export function wouldContinueStreak(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayISO = formatDateISO(yesterday)

  return isHabitDone(habitKey, yesterdayISO, categoriesByDate)
}

/**
 * Get streak that would result if habit is completed today
 */
export function getPotentialStreak(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): number {
  const today = new Date()
  const todayISO = formatDateISO(today)

  // If already done today, return current streak
  if (isHabitDone(habitKey, todayISO, categoriesByDate)) {
    return calculateStreak(habitKey, categoriesByDate)
  }

  // Calculate what streak would be if completed today
  let potentialStreak = 1
  let currentDate = new Date(today)
  currentDate.setDate(currentDate.getDate() - 1)

  while (true) {
    const dateISO = formatDateISO(currentDate)

    if (isHabitDone(habitKey, dateISO, categoriesByDate)) {
      potentialStreak++
      currentDate.setDate(currentDate.getDate() - 1)
    } else {
      break
    }
  }

  return potentialStreak
}

/**
 * Check if a habit is completed today
 */
export function isHabitDoneToday(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): boolean {
  const today = new Date()
  const todayISO = formatDateISO(today)
  return isHabitDone(habitKey, todayISO, categoriesByDate)
}
