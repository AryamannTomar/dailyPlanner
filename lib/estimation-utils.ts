import type { Task, TasksByDate } from "@/lib/types"
import { computeDeltaFromApprox, computeDurationSeconds, formatDurationHuman } from "@/lib/time-utils"

// Types for estimation analytics
export type EstimationStatus = "early" | "on-time" | "late"

export type TaskEstimationData = {
  task: Task
  date: string
  estimatedDuration: number // in seconds
  actualDuration: number // in seconds
  delta: number // in seconds (positive = took longer, negative = finished early)
  status: EstimationStatus
  accuracyPercent: number // 100 = perfect, lower = worse
}

export type EstimationAccuracyResult = {
  overallAccuracy: number // 0-100
  totalTasks: number
  earlyTasks: number
  onTimeTasks: number
  lateTasks: number
  averageDelta: number // in seconds
  averageOverestimate: number // in seconds
  averageUnderestimate: number // in seconds
}

export type TrendDataPoint = {
  date: string
  accuracy: number
  taskCount: number
  label: string
}

export type AccuracyByCategory = {
  category: string
  accuracy: number
  taskCount: number
  averageDelta: number
  trend: "improving" | "declining" | "stable"
}

export type ImprovementSuggestion = {
  type: "underestimate" | "overestimate" | "tag" | "priority" | "time_of_day" | "general"
  severity: "high" | "medium" | "low"
  message: string
  category?: string
  data?: {
    percentage?: number
    avgDelta?: number
    taskCount?: number
  }
}

// Helper to determine if a task has valid estimation data
function hasValidEstimationData(task: Task): boolean {
  return (
    task.completed &&
    Boolean(task.startTime) &&
    Boolean(task.approxEndTime) &&
    Boolean(task.actualEndTime)
  )
}

// Helper to get estimation status based on delta
function getEstimationStatus(deltaSeconds: number, toleranceSeconds: number = 300): EstimationStatus {
  if (deltaSeconds > toleranceSeconds) return "late"
  if (deltaSeconds < -toleranceSeconds) return "early"
  return "on-time"
}

// Helper to calculate accuracy percentage from delta
function calculateAccuracyFromDelta(estimatedDuration: number, delta: number): number {
  if (estimatedDuration === 0) return delta === 0 ? 100 : 0
  const accuracy = Math.max(0, 100 - (Math.abs(delta) / estimatedDuration) * 100)
  return Math.round(accuracy)
}

// Get all tasks with estimation data
export function getTasksWithEstimationData(tasksByDate: TasksByDate): TaskEstimationData[] {
  const result: TaskEstimationData[] = []

  for (const [date, tasks] of Object.entries(tasksByDate)) {
    for (const task of tasks) {
      if (!hasValidEstimationData(task)) continue

      const estimatedDuration = computeDurationSeconds(task.startTime, task.approxEndTime)
      const actualDuration = computeDurationSeconds(task.startTime, task.actualEndTime!)
      const delta = computeDeltaFromApprox(task.approxEndTime, task.actualEndTime!)
      const status = getEstimationStatus(delta)
      const accuracyPercent = calculateAccuracyFromDelta(estimatedDuration, delta)

      result.push({
        task,
        date,
        estimatedDuration,
        actualDuration,
        delta,
        status,
        accuracyPercent,
      })
    }
  }

  // Sort by date descending
  result.sort((a, b) => b.date.localeCompare(a.date))
  return result
}

// Calculate overall estimation accuracy
export function calculateEstimationAccuracy(tasksByDate: TasksByDate): EstimationAccuracyResult {
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  if (tasksWithData.length === 0) {
    return {
      overallAccuracy: 0,
      totalTasks: 0,
      earlyTasks: 0,
      onTimeTasks: 0,
      lateTasks: 0,
      averageDelta: 0,
      averageOverestimate: 0,
      averageUnderestimate: 0,
    }
  }

  let totalAccuracy = 0
  let earlyTasks = 0
  let onTimeTasks = 0
  let lateTasks = 0
  let totalDelta = 0
  let overestimateSum = 0
  let overestimateCount = 0
  let underestimateSum = 0
  let underestimateCount = 0

  for (const data of tasksWithData) {
    totalAccuracy += data.accuracyPercent
    totalDelta += data.delta

    switch (data.status) {
      case "early":
        earlyTasks++
        overestimateSum += Math.abs(data.delta)
        overestimateCount++
        break
      case "on-time":
        onTimeTasks++
        break
      case "late":
        lateTasks++
        underestimateSum += data.delta
        underestimateCount++
        break
    }
  }

  return {
    overallAccuracy: Math.round(totalAccuracy / tasksWithData.length),
    totalTasks: tasksWithData.length,
    earlyTasks,
    onTimeTasks,
    lateTasks,
    averageDelta: Math.round(totalDelta / tasksWithData.length),
    averageOverestimate: overestimateCount > 0 ? Math.round(overestimateSum / overestimateCount) : 0,
    averageUnderestimate: underestimateCount > 0 ? Math.round(underestimateSum / underestimateCount) : 0,
  }
}

// Get estimation trend over time
export function getEstimationTrend(tasksByDate: TasksByDate, days: number = 30): TrendDataPoint[] {
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  if (tasksWithData.length === 0) return []

  // Get the date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Group tasks by date
  const tasksByDay: Record<string, TaskEstimationData[]> = {}

  for (const data of tasksWithData) {
    const taskDate = new Date(data.date)
    if (taskDate >= startDate && taskDate <= endDate) {
      if (!tasksByDay[data.date]) {
        tasksByDay[data.date] = []
      }
      tasksByDay[data.date].push(data)
    }
  }

  // Calculate daily accuracy
  const trend: TrendDataPoint[] = []
  const sortedDates = Object.keys(tasksByDay).sort()

  for (const date of sortedDates) {
    const dayTasks = tasksByDay[date]
    const avgAccuracy = Math.round(
      dayTasks.reduce((sum, t) => sum + t.accuracyPercent, 0) / dayTasks.length
    )

    const dateObj = new Date(date)
    trend.push({
      date,
      accuracy: avgAccuracy,
      taskCount: dayTasks.length,
      label: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    })
  }

  return trend
}

// Get accuracy breakdown by tag
export function getAccuracyByTag(tasksByDate: TasksByDate): AccuracyByCategory[] {
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  if (tasksWithData.length === 0) return []

  // Group tasks by tag
  const tasksByTag: Record<string, TaskEstimationData[]> = {}

  for (const data of tasksWithData) {
    const tags = data.task.tags || []
    if (tags.length === 0) {
      // Include untagged tasks
      if (!tasksByTag["Untagged"]) {
        tasksByTag["Untagged"] = []
      }
      tasksByTag["Untagged"].push(data)
    } else {
      for (const tag of tags) {
        if (!tasksByTag[tag]) {
          tasksByTag[tag] = []
        }
        tasksByTag[tag].push(data)
      }
    }
  }

  // Calculate accuracy for each tag
  const result: AccuracyByCategory[] = []

  for (const [tag, tasks] of Object.entries(tasksByTag)) {
    if (tasks.length < 2) continue // Need at least 2 tasks for meaningful data

    const avgAccuracy = Math.round(
      tasks.reduce((sum, t) => sum + t.accuracyPercent, 0) / tasks.length
    )
    const avgDelta = Math.round(
      tasks.reduce((sum, t) => sum + t.delta, 0) / tasks.length
    )

    // Calculate trend (compare first half to second half)
    const midpoint = Math.floor(tasks.length / 2)
    const firstHalf = tasks.slice(0, midpoint)
    const secondHalf = tasks.slice(midpoint)

    const firstHalfAccuracy = firstHalf.length > 0
      ? firstHalf.reduce((sum, t) => sum + t.accuracyPercent, 0) / firstHalf.length
      : 0
    const secondHalfAccuracy = secondHalf.length > 0
      ? secondHalf.reduce((sum, t) => sum + t.accuracyPercent, 0) / secondHalf.length
      : 0

    let trend: "improving" | "declining" | "stable" = "stable"
    const trendDiff = secondHalfAccuracy - firstHalfAccuracy
    if (trendDiff > 5) trend = "improving"
    else if (trendDiff < -5) trend = "declining"

    result.push({
      category: tag,
      accuracy: avgAccuracy,
      taskCount: tasks.length,
      averageDelta: avgDelta,
      trend,
    })
  }

  // Sort by task count (most used tags first)
  result.sort((a, b) => b.taskCount - a.taskCount)
  return result
}

// Get accuracy breakdown by priority
export function getAccuracyByPriority(tasksByDate: TasksByDate): AccuracyByCategory[] {
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  if (tasksWithData.length === 0) return []

  // Group tasks by priority
  const tasksByPriority: Record<string, TaskEstimationData[]> = {
    high: [],
    medium: [],
    low: [],
    none: [],
  }

  for (const data of tasksWithData) {
    const priority = data.task.priority || "none"
    tasksByPriority[priority].push(data)
  }

  // Calculate accuracy for each priority
  const result: AccuracyByCategory[] = []
  const priorityLabels: Record<string, string> = {
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
    none: "No Priority",
  }

  for (const [priority, tasks] of Object.entries(tasksByPriority)) {
    if (tasks.length === 0) continue

    const avgAccuracy = Math.round(
      tasks.reduce((sum, t) => sum + t.accuracyPercent, 0) / tasks.length
    )
    const avgDelta = Math.round(
      tasks.reduce((sum, t) => sum + t.delta, 0) / tasks.length
    )

    // Calculate trend
    const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date))
    const midpoint = Math.floor(sortedTasks.length / 2)
    const firstHalf = sortedTasks.slice(0, midpoint)
    const secondHalf = sortedTasks.slice(midpoint)

    const firstHalfAccuracy = firstHalf.length > 0
      ? firstHalf.reduce((sum, t) => sum + t.accuracyPercent, 0) / firstHalf.length
      : 0
    const secondHalfAccuracy = secondHalf.length > 0
      ? secondHalf.reduce((sum, t) => sum + t.accuracyPercent, 0) / secondHalf.length
      : 0

    let trend: "improving" | "declining" | "stable" = "stable"
    const trendDiff = secondHalfAccuracy - firstHalfAccuracy
    if (trendDiff > 5) trend = "improving"
    else if (trendDiff < -5) trend = "declining"

    result.push({
      category: priorityLabels[priority],
      accuracy: avgAccuracy,
      taskCount: tasks.length,
      averageDelta: avgDelta,
      trend,
    })
  }

  return result
}

// Generate improvement suggestions based on historical data
export function suggestImprovement(tasksByDate: TasksByDate): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = []
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  if (tasksWithData.length < 5) {
    suggestions.push({
      type: "general",
      severity: "low",
      message: "Complete more tasks to get personalized improvement suggestions.",
      data: { taskCount: tasksWithData.length },
    })
    return suggestions
  }

  const accuracy = calculateEstimationAccuracy(tasksByDate)
  const byTag = getAccuracyByTag(tasksByDate)
  const byPriority = getAccuracyByPriority(tasksByDate)

  // Check overall underestimation/overestimation pattern
  if (accuracy.lateTasks > accuracy.earlyTasks * 2 && accuracy.lateTasks >= 3) {
    const percentLate = Math.round((accuracy.lateTasks / accuracy.totalTasks) * 100)
    suggestions.push({
      type: "underestimate",
      severity: percentLate > 60 ? "high" : "medium",
      message: `You tend to underestimate tasks - ${percentLate}% take longer than planned. Try adding ${formatDurationHuman(accuracy.averageUnderestimate)} buffer to your estimates.`,
      data: {
        percentage: percentLate,
        avgDelta: accuracy.averageUnderestimate,
      },
    })
  }

  if (accuracy.earlyTasks > accuracy.lateTasks * 2 && accuracy.earlyTasks >= 3) {
    const percentEarly = Math.round((accuracy.earlyTasks / accuracy.totalTasks) * 100)
    suggestions.push({
      type: "overestimate",
      severity: percentEarly > 60 ? "high" : "medium",
      message: `You tend to overestimate tasks - ${percentEarly}% finish early. Consider reducing estimates by ~${formatDurationHuman(accuracy.averageOverestimate)}.`,
      data: {
        percentage: percentEarly,
        avgDelta: accuracy.averageOverestimate,
      },
    })
  }

  // Check for problematic tags
  for (const tagData of byTag) {
    if (tagData.taskCount < 3) continue

    if (tagData.accuracy < 60) {
      const isUnderestimate = tagData.averageDelta > 0
      suggestions.push({
        type: "tag",
        severity: tagData.accuracy < 40 ? "high" : "medium",
        message: isUnderestimate
          ? `You tend to underestimate "${tagData.category}" tasks by an average of ${formatDurationHuman(Math.abs(tagData.averageDelta))}.`
          : `You tend to overestimate "${tagData.category}" tasks by an average of ${formatDurationHuman(Math.abs(tagData.averageDelta))}.`,
        category: tagData.category,
        data: {
          percentage: tagData.accuracy,
          avgDelta: tagData.averageDelta,
          taskCount: tagData.taskCount,
        },
      })
    }
  }

  // Check for priority-based patterns
  for (const priorityData of byPriority) {
    if (priorityData.taskCount < 3) continue

    if (priorityData.accuracy < 60 && priorityData.averageDelta > 0) {
      const percentLonger = Math.round((Math.abs(priorityData.averageDelta) / 3600) * 100)
      suggestions.push({
        type: "priority",
        severity: priorityData.accuracy < 40 ? "high" : "medium",
        message: `${priorityData.category} tasks take ${formatDurationHuman(Math.abs(priorityData.averageDelta))} longer than estimated on average.`,
        category: priorityData.category,
        data: {
          percentage: percentLonger,
          avgDelta: priorityData.averageDelta,
          taskCount: priorityData.taskCount,
        },
      })
    }
  }

  // Add general encouragement if doing well
  if (accuracy.overallAccuracy >= 80 && suggestions.length === 0) {
    suggestions.push({
      type: "general",
      severity: "low",
      message: `Great job! Your estimation accuracy is ${accuracy.overallAccuracy}%. Keep up the good work!`,
      data: { percentage: accuracy.overallAccuracy },
    })
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return suggestions
}

// Get common estimation errors (tasks that take longer/less than estimated)
export function getCommonEstimationErrors(tasksByDate: TasksByDate): {
  overruns: TaskEstimationData[]
  underruns: TaskEstimationData[]
} {
  const tasksWithData = getTasksWithEstimationData(tasksByDate)

  // Sort by absolute delta to find worst offenders
  const sortedByDelta = [...tasksWithData].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  const overruns = sortedByDelta
    .filter(t => t.status === "late")
    .slice(0, 10) // Top 10 overruns

  const underruns = sortedByDelta
    .filter(t => t.status === "early")
    .slice(0, 10) // Top 10 underruns

  return { overruns, underruns }
}

// Format delta time for display (e.g., "+15min" or "-5min")
export function formatDeltaTime(deltaSeconds: number): string {
  const absSeconds = Math.abs(deltaSeconds)
  const sign = deltaSeconds > 0 ? "+" : "-"

  if (absSeconds < 60) {
    return `${sign}${absSeconds}s`
  }

  const minutes = Math.floor(absSeconds / 60)
  if (minutes < 60) {
    return `${sign}${minutes}min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${sign}${hours}h`
  }

  return `${sign}${hours}h ${remainingMinutes}min`
}

// Get color class based on estimation status
export function getStatusColor(status: EstimationStatus): string {
  switch (status) {
    case "early":
      return "text-green-600 dark:text-green-400"
    case "on-time":
      return "text-yellow-600 dark:text-yellow-400"
    case "late":
      return "text-red-600 dark:text-red-400"
  }
}

// Get background color class based on estimation status
export function getStatusBgColor(status: EstimationStatus): string {
  switch (status) {
    case "early":
      return "bg-green-100 dark:bg-green-900/30"
    case "on-time":
      return "bg-yellow-100 dark:bg-yellow-900/30"
    case "late":
      return "bg-red-100 dark:bg-red-900/30"
  }
}
