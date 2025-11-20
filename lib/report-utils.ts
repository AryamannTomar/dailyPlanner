import type { TasksByDate, CategoriesByDate, Task, HabitDefinition, CategoryKey } from '@/lib/types'
import { isHabitCompleted, getHabitValue, getHabitGoal } from '@/lib/types'
import { formatISODate, addDays, getStartOfWeek, startOfMonth, endOfMonth } from '@/lib/date-utils'

// Types for report data
export type DayMetrics = {
  date: string
  tasksCompleted: number
  totalTasks: number
  completionRate: number
  timeWorkedSeconds: number
  habitsCompleted: number
  totalHabits: number
}

export type WeeklyReport = {
  weekStart: string
  weekEnd: string
  totalTasksCompleted: number
  totalTasks: number
  completionRate: number
  totalTimeWorkedSeconds: number
  averageTimePerDay: number
  productiveDays: number
  mostProductiveDay: { date: string; tasks: number } | null
  leastProductiveDay: { date: string; tasks: number } | null
  dailyMetrics: DayMetrics[]
  habitMetrics: HabitReportMetrics[]
  tasksByPriority: { high: number; medium: number; low: number; none: number }
  averageTasksPerDay: number
  streakDays: number
}

export type MonthlyReport = {
  month: string
  year: number
  monthName: string
  totalTasksCompleted: number
  totalTasks: number
  completionRate: number
  totalTimeWorkedSeconds: number
  averageTimePerDay: number
  productiveDays: number
  mostProductiveDay: { date: string; tasks: number } | null
  leastProductiveDay: { date: string; tasks: number } | null
  weeklyBreakdown: WeekSummary[]
  dailyMetrics: DayMetrics[]
  habitMetrics: HabitReportMetrics[]
  tasksByPriority: { high: number; medium: number; low: number; none: number }
  averageTasksPerDay: number
  bestWeek: { weekStart: string; tasks: number } | null
  streakDays: number
}

export type WeekSummary = {
  weekStart: string
  weekEnd: string
  tasksCompleted: number
  totalTasks: number
  completionRate: number
  timeWorkedSeconds: number
}

export type HabitReportMetrics = {
  habitId: string
  habitName: string
  habitColor: string
  completedDays: number
  totalDays: number
  completionRate: number
  currentStreak: number
  longestStreak: number
  dailyCompletion: { date: string; completed: boolean; value?: number; goal?: number }[]
}

export type ComparisonData = {
  current: number
  previous: number
  change: number
  changePercent: number
  improved: boolean
}

export type ReportComparison = {
  tasksCompleted: ComparisonData
  completionRate: ComparisonData
  timeWorked: ComparisonData
  productiveDays: ComparisonData
  averageTasksPerDay: ComparisonData
}

// Helper functions
function getDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = []
  const current = new Date(start)
  while (current <= end) {
    dates.push(formatISODate(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function calculateTimeWorked(tasks: Task[]): number {
  return tasks.reduce((total, task) => {
    if (task.completed && task.durationSeconds) {
      return total + task.durationSeconds
    }
    return total
  }, 0)
}

function calculateDayMetrics(
  dateISO: string,
  tasksByDate: TasksByDate,
  categoriesByDate: CategoriesByDate,
  habits: HabitDefinition[]
): DayMetrics {
  const tasks = tasksByDate[dateISO] || []
  const categories = categoriesByDate[dateISO] || {}

  const completedTasks = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length
  const timeWorkedSeconds = calculateTimeWorked(tasks)

  let habitsCompleted = 0
  let totalHabits = habits.length

  for (const habit of habits) {
    const entry = categories[habit.id]
    if (entry && isHabitCompleted(entry)) {
      habitsCompleted++
    }
  }

  return {
    date: dateISO,
    tasksCompleted: completedTasks,
    totalTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    timeWorkedSeconds,
    habitsCompleted,
    totalHabits,
  }
}

function calculateHabitStreak(
  habitId: string,
  dates: string[],
  categoriesByDate: CategoriesByDate
): { current: number; longest: number } {
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0

  // Sort dates in descending order for current streak
  const sortedDates = [...dates].sort().reverse()

  // Calculate current streak (from most recent)
  for (const date of sortedDates) {
    const categories = categoriesByDate[date]
    const entry = categories && categories[habitId]
    if (entry && isHabitCompleted(entry)) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate longest streak
  const ascDates = [...dates].sort()
  for (const date of ascDates) {
    const categories = categoriesByDate[date]
    const entry = categories && categories[habitId]
    if (entry && isHabitCompleted(entry)) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  return { current: currentStreak, longest: longestStreak }
}

function calculateTaskStreak(
  dates: string[],
  tasksByDate: TasksByDate
): number {
  let streak = 0
  const sortedDates = [...dates].sort().reverse()

  for (const date of sortedDates) {
    const tasks = tasksByDate[date] || []
    const hasCompletedTasks = tasks.some(t => t.completed)
    if (hasCompletedTasks) {
      streak++
    } else if (tasks.length > 0) {
      // Had tasks but didn't complete any
      break
    }
    // Skip days with no tasks
  }

  return streak
}

function getHabitMetrics(
  habits: HabitDefinition[],
  dates: string[],
  categoriesByDate: CategoriesByDate
): HabitReportMetrics[] {
  return habits.map(habit => {
    const dailyCompletion: HabitReportMetrics['dailyCompletion'] = []
    let completedDays = 0

    for (const date of dates) {
      const categories = categoriesByDate[date]
      const entry = categories && categories[habit.id]
      const completed = entry ? isHabitCompleted(entry) : false

      if (completed) completedDays++

      if (entry && typeof entry === 'object') {
        dailyCompletion.push({
          date,
          completed,
          value: getHabitValue(entry),
          goal: getHabitGoal(entry),
        })
      } else {
        dailyCompletion.push({ date, completed })
      }
    }

    const streaks = calculateHabitStreak(habit.id, dates, categoriesByDate)

    return {
      habitId: habit.id,
      habitName: habit.name,
      habitColor: habit.color,
      completedDays,
      totalDays: dates.length,
      completionRate: dates.length > 0 ? Math.round((completedDays / dates.length) * 100) : 0,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      dailyCompletion,
    }
  })
}

function getTasksByPriority(tasks: Task[]): { high: number; medium: number; low: number; none: number } {
  const result = { high: 0, medium: 0, low: 0, none: 0 }

  for (const task of tasks) {
    if (task.completed) {
      switch (task.priority) {
        case 'high':
          result.high++
          break
        case 'medium':
          result.medium++
          break
        case 'low':
          result.low++
          break
        default:
          result.none++
      }
    }
  }

  return result
}

/**
 * Generate a weekly report
 */
export function generateWeeklyReport(
  tasksByDate: TasksByDate,
  categoriesByDate: CategoriesByDate,
  weekStart: Date,
  habits: HabitDefinition[] = []
): WeeklyReport {
  const weekEnd = addDays(weekStart, 6)
  const dates = getDatesInRange(weekStart, weekEnd)

  const dailyMetrics: DayMetrics[] = dates.map(date =>
    calculateDayMetrics(date, tasksByDate, categoriesByDate, habits)
  )

  let totalTasksCompleted = 0
  let totalTasks = 0
  let totalTimeWorkedSeconds = 0
  let productiveDays = 0
  let mostProductiveDay: { date: string; tasks: number } | null = null
  let leastProductiveDay: { date: string; tasks: number } | null = null
  const allCompletedTasks: Task[] = []

  for (const metrics of dailyMetrics) {
    totalTasksCompleted += metrics.tasksCompleted
    totalTasks += metrics.totalTasks
    totalTimeWorkedSeconds += metrics.timeWorkedSeconds

    if (metrics.tasksCompleted > 0) {
      productiveDays++
    }

    if (metrics.totalTasks > 0) {
      if (!mostProductiveDay || metrics.tasksCompleted > mostProductiveDay.tasks) {
        mostProductiveDay = { date: metrics.date, tasks: metrics.tasksCompleted }
      }
      if (!leastProductiveDay || metrics.tasksCompleted < leastProductiveDay.tasks) {
        leastProductiveDay = { date: metrics.date, tasks: metrics.tasksCompleted }
      }
    }

    const tasks = tasksByDate[metrics.date] || []
    allCompletedTasks.push(...tasks.filter(t => t.completed))
  }

  const habitMetrics = getHabitMetrics(habits, dates, categoriesByDate)
  const tasksByPriority = getTasksByPriority(allCompletedTasks)
  const streakDays = calculateTaskStreak(dates, tasksByDate)

  return {
    weekStart: formatISODate(weekStart),
    weekEnd: formatISODate(weekEnd),
    totalTasksCompleted,
    totalTasks,
    completionRate: totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0,
    totalTimeWorkedSeconds,
    averageTimePerDay: Math.round(totalTimeWorkedSeconds / 7),
    productiveDays,
    mostProductiveDay,
    leastProductiveDay,
    dailyMetrics,
    habitMetrics,
    tasksByPriority,
    averageTasksPerDay: Math.round((totalTasksCompleted / 7) * 10) / 10,
    streakDays,
  }
}

/**
 * Generate a monthly report
 */
export function generateMonthlyReport(
  tasksByDate: TasksByDate,
  categoriesByDate: CategoriesByDate,
  month: Date,
  habits: HabitDefinition[] = []
): MonthlyReport {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const dates = getDatesInRange(monthStart, monthEnd)
  const daysInMonth = dates.length

  const dailyMetrics: DayMetrics[] = dates.map(date =>
    calculateDayMetrics(date, tasksByDate, categoriesByDate, habits)
  )

  let totalTasksCompleted = 0
  let totalTasks = 0
  let totalTimeWorkedSeconds = 0
  let productiveDays = 0
  let mostProductiveDay: { date: string; tasks: number } | null = null
  let leastProductiveDay: { date: string; tasks: number } | null = null
  const allCompletedTasks: Task[] = []

  for (const metrics of dailyMetrics) {
    totalTasksCompleted += metrics.tasksCompleted
    totalTasks += metrics.totalTasks
    totalTimeWorkedSeconds += metrics.timeWorkedSeconds

    if (metrics.tasksCompleted > 0) {
      productiveDays++
    }

    if (metrics.totalTasks > 0) {
      if (!mostProductiveDay || metrics.tasksCompleted > mostProductiveDay.tasks) {
        mostProductiveDay = { date: metrics.date, tasks: metrics.tasksCompleted }
      }
      if (!leastProductiveDay || metrics.tasksCompleted < leastProductiveDay.tasks) {
        leastProductiveDay = { date: metrics.date, tasks: metrics.tasksCompleted }
      }
    }

    const tasks = tasksByDate[metrics.date] || []
    allCompletedTasks.push(...tasks.filter(t => t.completed))
  }

  // Calculate weekly breakdown
  const weeklyBreakdown: WeekSummary[] = []
  let currentWeekStart = getStartOfWeek(monthStart)

  while (currentWeekStart <= monthEnd) {
    const weekEnd = addDays(currentWeekStart, 6)
    const weekDates = getDatesInRange(
      currentWeekStart < monthStart ? monthStart : currentWeekStart,
      weekEnd > monthEnd ? monthEnd : weekEnd
    )

    let weekTasksCompleted = 0
    let weekTotalTasks = 0
    let weekTimeWorked = 0

    for (const date of weekDates) {
      const tasks = tasksByDate[date] || []
      weekTasksCompleted += tasks.filter(t => t.completed).length
      weekTotalTasks += tasks.length
      weekTimeWorked += calculateTimeWorked(tasks)
    }

    weeklyBreakdown.push({
      weekStart: formatISODate(currentWeekStart < monthStart ? monthStart : currentWeekStart),
      weekEnd: formatISODate(weekEnd > monthEnd ? monthEnd : weekEnd),
      tasksCompleted: weekTasksCompleted,
      totalTasks: weekTotalTasks,
      completionRate: weekTotalTasks > 0 ? Math.round((weekTasksCompleted / weekTotalTasks) * 100) : 0,
      timeWorkedSeconds: weekTimeWorked,
    })

    currentWeekStart = addDays(currentWeekStart, 7)
  }

  // Find best week
  const bestWeek = weeklyBreakdown.reduce<{ weekStart: string; tasks: number } | null>((best, week) => {
    if (!best || week.tasksCompleted > best.tasks) {
      return { weekStart: week.weekStart, tasks: week.tasksCompleted }
    }
    return best
  }, null)

  const habitMetrics = getHabitMetrics(habits, dates, categoriesByDate)
  const tasksByPriority = getTasksByPriority(allCompletedTasks)
  const streakDays = calculateTaskStreak(dates, tasksByDate)

  const monthName = month.toLocaleDateString(undefined, { month: 'long' })

  return {
    month: formatISODate(monthStart),
    year: month.getFullYear(),
    monthName,
    totalTasksCompleted,
    totalTasks,
    completionRate: totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0,
    totalTimeWorkedSeconds,
    averageTimePerDay: Math.round(totalTimeWorkedSeconds / daysInMonth),
    productiveDays,
    mostProductiveDay,
    leastProductiveDay,
    weeklyBreakdown,
    dailyMetrics,
    habitMetrics,
    tasksByPriority,
    averageTasksPerDay: Math.round((totalTasksCompleted / daysInMonth) * 10) / 10,
    bestWeek,
    streakDays,
  }
}

/**
 * Generate comparison data between two periods
 */
export function generateComparison(
  current: WeeklyReport | MonthlyReport,
  previous: WeeklyReport | MonthlyReport
): ReportComparison {
  const createComparison = (currentVal: number, previousVal: number): ComparisonData => {
    const change = currentVal - previousVal
    const changePercent = previousVal > 0 ? Math.round((change / previousVal) * 100) : currentVal > 0 ? 100 : 0
    return {
      current: currentVal,
      previous: previousVal,
      change,
      changePercent,
      improved: change > 0,
    }
  }

  return {
    tasksCompleted: createComparison(current.totalTasksCompleted, previous.totalTasksCompleted),
    completionRate: createComparison(current.completionRate, previous.completionRate),
    timeWorked: createComparison(current.totalTimeWorkedSeconds, previous.totalTimeWorkedSeconds),
    productiveDays: createComparison(current.productiveDays, previous.productiveDays),
    averageTasksPerDay: createComparison(current.averageTasksPerDay, previous.averageTasksPerDay),
  }
}

/**
 * Format time in seconds to readable string
 */
export function formatTimeWorked(seconds: number): string {
  if (seconds < 60) return `${seconds}s`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  return `${minutes}m`
}

/**
 * Get previous week start date
 */
export function getPreviousWeekStart(weekStart: Date): Date {
  return addDays(weekStart, -7)
}

/**
 * Get previous month date
 */
export function getPreviousMonth(month: Date): Date {
  const prev = new Date(month)
  prev.setMonth(prev.getMonth() - 1)
  return prev
}

/**
 * Generate shareable report summary text
 */
export function generateReportSummary(
  report: WeeklyReport | MonthlyReport,
  type: 'weekly' | 'monthly'
): string {
  const isWeekly = type === 'weekly'
  const periodLabel = isWeekly
    ? `Week of ${new Date((report as WeeklyReport).weekStart + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : `${(report as MonthlyReport).monthName} ${(report as MonthlyReport).year}`

  const lines = [
    `Daily Flow - ${periodLabel} Report`,
    '',
    `Tasks Completed: ${report.totalTasksCompleted}/${report.totalTasks} (${report.completionRate}%)`,
    `Time Worked: ${formatTimeWorked(report.totalTimeWorkedSeconds)}`,
    `Productive Days: ${report.productiveDays}`,
    `Average Tasks/Day: ${report.averageTasksPerDay}`,
  ]

  if (report.mostProductiveDay) {
    const date = new Date(report.mostProductiveDay.date + 'T00:00:00')
    lines.push(`Best Day: ${date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} (${report.mostProductiveDay.tasks} tasks)`)
  }

  if (report.habitMetrics.length > 0) {
    lines.push('')
    lines.push('Habits:')
    for (const habit of report.habitMetrics) {
      lines.push(`- ${habit.habitName}: ${habit.completionRate}% (${habit.currentStreak} day streak)`)
    }
  }

  return lines.join('\n')
}

/**
 * Get chart data for tasks completed per day
 */
export function getTasksChartData(dailyMetrics: DayMetrics[]): Array<{
  date: string
  label: string
  completed: number
  total: number
}> {
  return dailyMetrics.map(metric => ({
    date: metric.date,
    label: new Date(metric.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    completed: metric.tasksCompleted,
    total: metric.totalTasks,
  }))
}

/**
 * Get chart data for completion rate trend
 */
export function getCompletionRateChartData(dailyMetrics: DayMetrics[]): Array<{
  date: string
  label: string
  rate: number
}> {
  return dailyMetrics.map(metric => ({
    date: metric.date,
    label: new Date(metric.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
    rate: metric.completionRate,
  }))
}

/**
 * Get chart data for time worked per day
 */
export function getTimeWorkedChartData(dailyMetrics: DayMetrics[]): Array<{
  date: string
  label: string
  hours: number
  minutes: number
}> {
  return dailyMetrics.map(metric => ({
    date: metric.date,
    label: new Date(metric.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    hours: Math.round((metric.timeWorkedSeconds / 3600) * 10) / 10,
    minutes: Math.round(metric.timeWorkedSeconds / 60),
  }))
}

/**
 * Get heatmap data for habits
 */
export function getHabitsHeatmapData(habitMetrics: HabitReportMetrics[]): Array<{
  date: string
  habitId: string
  habitName: string
  completed: boolean
  value?: number
  goal?: number
}> {
  const data: Array<{
    date: string
    habitId: string
    habitName: string
    completed: boolean
    value?: number
    goal?: number
  }> = []

  for (const habit of habitMetrics) {
    for (const day of habit.dailyCompletion) {
      data.push({
        date: day.date,
        habitId: habit.habitId,
        habitName: habit.habitName,
        completed: day.completed,
        value: day.value,
        goal: day.goal,
      })
    }
  }

  return data
}
