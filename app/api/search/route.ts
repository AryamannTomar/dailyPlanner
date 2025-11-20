import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/state-store'
import type { Task, TaskPriority } from '@/lib/types'
import {
  flattenTasksByDate,
  filterTasks,
  searchTasks,
  type SearchFilters,
  type TaskWithDate,
} from '@/lib/search-utils'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  // Parse query parameters
  const query = searchParams.get('q') || ''
  const status = (searchParams.get('status') as SearchFilters['status']) || 'all'
  const priority = (searchParams.get('priority') as SearchFilters['priority']) || 'all'
  const tagsParam = searchParams.get('tags')
  const tags = tagsParam ? tagsParam.split(',').filter(t => t.trim()) : []
  const fromDate = searchParams.get('fromDate') || null
  const toDate = searchParams.get('toDate') || null

  try {
    const state = await getState()

    // Flatten all tasks with their dates
    const allTasks = flattenTasksByDate(state.tasksByDate)

    // Build filters object
    const filters: SearchFilters = {
      query,
      status,
      priority,
      tags,
      fromDate,
      toDate,
    }

    // Apply filters
    const filteredTasks = filterTasks(allTasks, filters)

    // Return results
    return NextResponse.json({
      tasks: filteredTasks,
      totalCount: allTasks.length,
      resultCount: filteredTasks.length,
      filters,
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search tasks' },
      { status: 500 }
    )
  }
}
