import type { CategoriesByDate, CategoryKey, HabitDefinition } from '@/lib/types'
import { isHabitCompleted } from '@/lib/types'
import { formatISODate, getStartOfWeek, addDays, startOfMonth, endOfMonth } from '@/lib/date-utils'

export type HabitStats = {
  habitKey: CategoryKey
  completionRate: number
  weeklyCompletion: { completed: number; total: number; rate: number }
  monthlyCompletion: { completed: number; total: number; rate: number }
  bestDay: { day: string; dayIndex: number; rate: number } | null
  weeklyTrend: { day: string; completed: number; dayIndex: number }[]
  streakCurrent: number
  streakLongest: number
}

export type AllHabitStats = Record<string, HabitStats>

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Calculate completion rate for a habit over a specified number of days
 */
export function calculateCompletionRate(
  habitKey: CategoryKey,
  days: number,
  categoriesByDate: CategoriesByDate
): number {
  const today = new Date()
  let completed = 0
  let total = 0

  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i)
    const iso = formatISODate(date)
    const categories = categoriesByDate[iso]

    if (categories) {
      total++
      const entry = categories[habitKey]
      if (entry && isHabitCompleted(entry)) {
        completed++
      }
    } else {
      // Count days without data as part of total but not completed
      total++
    }
  }

  return total === 0 ? 0 : Math.round((completed / total) * 100)
}

/**
 * Calculate completion for the current week (Monday to Sunday)
 */
export function calculateWeeklyCompletion(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): { completed: number; total: number; rate: number } {
  const today = new Date()
  const weekStart = getStartOfWeek(today)
  let completed = 0
  let total = 0

  // Count only up to today for the current week
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    if (date > today) break

    const iso = formatISODate(date)
    total++

    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    if (entry && isHabitCompleted(entry)) {
      completed++
    }
  }

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, rate }
}

/**
 * Calculate completion for the current month
 */
export function calculateMonthlyCompletion(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): { completed: number; total: number; rate: number } {
  const today = new Date()
  const monthStart = startOfMonth(today)
  let completed = 0
  let total = 0

  // Count only up to today for the current month
  const current = new Date(monthStart)
  while (current <= today) {
    const iso = formatISODate(current)
    total++

    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    if (entry && isHabitCompleted(entry)) {
      completed++
    }

    current.setDate(current.getDate() + 1)
  }

  const rate = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { completed, total, rate }
}

/**
 * Get the day of week with the best completion rate
 */
export function getBestDay(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate,
  days: number = 90
): { day: string; dayIndex: number; rate: number } | null {
  const today = new Date()
  const dayStats: { completed: number; total: number }[] = Array(7).fill(null).map(() => ({ completed: 0, total: 0 }))

  for (let i = 0; i < days; i++) {
    const date = addDays(today, -i)
    const dayOfWeek = date.getDay()
    const iso = formatISODate(date)

    dayStats[dayOfWeek].total++

    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    if (entry && isHabitCompleted(entry)) {
      dayStats[dayOfWeek].completed++
    }
  }

  let bestDay: { day: string; dayIndex: number; rate: number } | null = null
  let bestRate = -1

  for (let i = 0; i < 7; i++) {
    const { completed, total } = dayStats[i]
    if (total > 0) {
      const rate = Math.round((completed / total) * 100)
      if (rate > bestRate) {
        bestRate = rate
        bestDay = { day: DAY_NAMES[i], dayIndex: i, rate }
      }
    }
  }

  return bestDay
}

/**
 * Get weekly trend data for charts (last 7 days starting from Monday of current week)
 */
export function getWeeklyTrend(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): { day: string; completed: number; dayIndex: number }[] {
  const today = new Date()
  const weekStart = getStartOfWeek(today)
  const trend: { day: string; completed: number; dayIndex: number }[] = []

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    const iso = formatISODate(date)
    const dayIndex = date.getDay()

    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    const completed = entry && isHabitCompleted(entry) ? 1 : 0

    trend.push({
      day: SHORT_DAY_NAMES[dayIndex],
      completed,
      dayIndex,
    })
  }

  return trend
}

/**
 * Calculate current and longest streaks for a habit
 */
export function calculateStreaks(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): { current: number; longest: number } {
  // Get all dates sorted
  const dates = Object.keys(categoriesByDate).sort()
  if (dates.length === 0) return { current: 0, longest: 0 }

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  // Check if today is part of the streak
  const today = formatISODate(new Date())
  const todayCategories = categoriesByDate[today]
  const todayEntry = todayCategories && todayCategories[habitKey]
  let todayCompleted = todayEntry && isHabitCompleted(todayEntry)

  // Calculate longest streak and check current
  for (let i = dates.length - 1; i >= 0; i--) {
    const iso = dates[i]
    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    const completed = entry && isHabitCompleted(entry)

    if (completed) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  // Recalculate for actual streaks
  tempStreak = 0
  for (const iso of dates) {
    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    const completed = entry && isHabitCompleted(entry)

    if (completed) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  // Calculate current streak (consecutive days ending at today or yesterday)
  const yesterday = addDays(new Date(), -1)
  let checkDate = todayCompleted ? new Date() : yesterday

  while (true) {
    const iso = formatISODate(checkDate)
    const categories = categoriesByDate[iso]
    const entry = categories && categories[habitKey]
    const completed = entry && isHabitCompleted(entry)

    if (completed) {
      currentStreak++
      checkDate = addDays(checkDate, -1)
    } else {
      break
    }
  }

  return { current: currentStreak, longest: longestStreak }
}

/**
 * Get all statistics for a single habit
 */
export function getHabitStats(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate,
  days: number = 30
): HabitStats {
  const streaks = calculateStreaks(habitKey, categoriesByDate)

  return {
    habitKey,
    completionRate: calculateCompletionRate(habitKey, days, categoriesByDate),
    weeklyCompletion: calculateWeeklyCompletion(habitKey, categoriesByDate),
    monthlyCompletion: calculateMonthlyCompletion(habitKey, categoriesByDate),
    bestDay: getBestDay(habitKey, categoriesByDate, days),
    weeklyTrend: getWeeklyTrend(habitKey, categoriesByDate),
    streakCurrent: streaks.current,
    streakLongest: streaks.longest,
  }
}

/**
 * Get statistics for all habits
 */
export function getAllHabitStats(
  categoriesByDate: CategoriesByDate,
  habits: HabitDefinition[],
  days: number = 30
): Record<string, HabitStats> {
  const stats: Record<string, HabitStats> = {}
  for (const habit of habits) {
    stats[habit.id] = getHabitStats(habit.id, categoriesByDate, days)
  }

  return stats
}

/**
 * Get mini stats for a habit (for displaying in pill tooltip)
 */
export function getHabitMiniStats(
  habitKey: CategoryKey,
  categoriesByDate: CategoriesByDate
): {
  weeklyCompleted: number
  weeklyTotal: number
  monthlyRate: number
  currentStreak: number
} {
  const weekly = calculateWeeklyCompletion(habitKey, categoriesByDate)
  const monthly = calculateMonthlyCompletion(habitKey, categoriesByDate)
  const streaks = calculateStreaks(habitKey, categoriesByDate)

  return {
    weeklyCompleted: weekly.completed,
    weeklyTotal: weekly.total,
    monthlyRate: monthly.rate,
    currentStreak: streaks.current,
  }
}
