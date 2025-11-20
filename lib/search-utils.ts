import type { Task, TaskPriority } from '@/lib/types'

// Search filters type definition
export type SearchFilters = {
  query: string
  status: 'all' | 'completed' | 'incomplete'
  priority: 'all' | 'high' | 'medium' | 'low'
  tags: string[]
  fromDate: string | null
  toDate: string | null
}

// Task with date and match information
export type TaskWithDate = Task & {
  date: string
  matchedFields?: string[]
  highlightRanges?: { start: number; end: number }[]
}

// Default empty filters
export const defaultFilters: SearchFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  tags: [],
  fromDate: null,
  toDate: null,
}

/**
 * Simple fuzzy search implementation
 * Returns true if all characters in the query appear in the text in order
 */
function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  let textIndex = 0
  let queryIndex = 0

  while (textIndex < textLower.length && queryIndex < queryLower.length) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      queryIndex++
    }
    textIndex++
  }

  return queryIndex === queryLower.length
}

/**
 * Get the match ranges for highlighting
 */
export function getMatchRanges(text: string, query: string): { start: number; end: number }[] {
  if (!query.trim()) return []

  const ranges: { start: number; end: number }[] = []
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase().trim()

  // First try exact substring match
  let index = textLower.indexOf(queryLower)
  if (index !== -1) {
    while (index !== -1) {
      ranges.push({ start: index, end: index + queryLower.length })
      index = textLower.indexOf(queryLower, index + 1)
    }
    return ranges
  }

  // Fall back to word matching for partial queries
  const words = queryLower.split(/\s+/).filter(w => w.length > 0)
  for (const word of words) {
    let wordIndex = textLower.indexOf(word)
    while (wordIndex !== -1) {
      ranges.push({ start: wordIndex, end: wordIndex + word.length })
      wordIndex = textLower.indexOf(word, wordIndex + 1)
    }
  }

  // Merge overlapping ranges
  if (ranges.length === 0) return []

  ranges.sort((a, b) => a.start - b.start)
  const merged: { start: number; end: number }[] = [ranges[0]]

  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1]
    const current = ranges[i]

    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }

  return merged
}

/**
 * Search tasks by query string using fuzzy search
 * Searches in task description, tags, and notes
 */
export function searchTasks(tasks: TaskWithDate[], query: string): TaskWithDate[] {
  if (!query.trim()) return tasks

  const queryLower = query.toLowerCase().trim()

  return tasks.filter(task => {
    const matchedFields: string[] = []
    let highlightRanges: { start: number; end: number }[] = []

    // Search in description (primary)
    if (task.description.toLowerCase().includes(queryLower) || fuzzyMatch(task.description, query)) {
      matchedFields.push('description')
      highlightRanges = getMatchRanges(task.description, query)
    }

    // Search in tags
    if (task.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
      matchedFields.push('tags')
    }

    // Search in notes
    if (task.notes?.toLowerCase().includes(queryLower)) {
      matchedFields.push('notes')
    }

    // Search in link titles
    if (task.links?.some(link => link.title.toLowerCase().includes(queryLower))) {
      matchedFields.push('links')
    }

    if (matchedFields.length > 0) {
      task.matchedFields = matchedFields
      task.highlightRanges = highlightRanges
      return true
    }

    return false
  })
}

/**
 * Apply multiple filters to tasks
 */
export function filterTasks(tasks: TaskWithDate[], filters: SearchFilters): TaskWithDate[] {
  let result = [...tasks]

  // Filter by status
  if (filters.status !== 'all') {
    result = result.filter(task => {
      if (filters.status === 'completed') return task.completed
      if (filters.status === 'incomplete') return !task.completed
      return true
    })
  }

  // Filter by priority
  if (filters.priority !== 'all') {
    result = result.filter(task => {
      const taskPriority = task.priority || null
      return taskPriority === filters.priority
    })
  }

  // Filter by tags (any match)
  if (filters.tags.length > 0) {
    result = result.filter(task => {
      if (!task.tags || task.tags.length === 0) return false
      return filters.tags.some(filterTag =>
        task.tags!.some(taskTag => taskTag.toLowerCase() === filterTag.toLowerCase())
      )
    })
  }

  // Filter by date range
  if (filters.fromDate) {
    result = result.filter(task => task.date >= filters.fromDate!)
  }

  if (filters.toDate) {
    result = result.filter(task => task.date <= filters.toDate!)
  }

  // Apply search query
  if (filters.query.trim()) {
    result = searchTasks(result, filters.query)
  }

  return result
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.tags.length > 0 ||
    filters.fromDate !== null ||
    filters.toDate !== null
  )
}

/**
 * Get all unique tags from tasks
 */
export function getAllTags(tasksByDate: Record<string, Task[]>): string[] {
  const tagSet = new Set<string>()

  Object.values(tasksByDate).forEach(tasks => {
    tasks.forEach(task => {
      if (task.tags) {
        task.tags.forEach(tag => tagSet.add(tag))
      }
    })
  })

  return Array.from(tagSet).sort()
}

/**
 * Flatten tasks by date into array with date info
 */
export function flattenTasksByDate(tasksByDate: Record<string, Task[]>): TaskWithDate[] {
  const result: TaskWithDate[] = []

  Object.entries(tasksByDate).forEach(([date, tasks]) => {
    tasks.forEach(task => {
      result.push({ ...task, date })
    })
  })

  // Sort by date descending, then by start time
  result.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date) // Most recent first
    }
    return a.startTime.localeCompare(b.startTime)
  })

  return result
}
