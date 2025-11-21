import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/state-store'
import { exportToCSV, exportHabitsToCSV } from '@/lib/data-export-utils'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as 'all' | 'tasks' | 'habits' || 'tasks'
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined

    // Validate type parameter
    if (type && !['all', 'tasks', 'habits'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Expected: all, tasks, or habits' },
        { status: 400 }
      )
    }

    // Validate date format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (fromDate && !dateRegex.test(fromDate)) {
      return NextResponse.json(
        { error: 'Invalid fromDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }
    if (toDate && !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid toDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Get state
    const state = await getState()
    const options = { fromDate, toDate }

    let csvContent: string
    let typePart: string

    if (type === 'habits') {
      // Export only habits
      csvContent = exportHabitsToCSV(state.categoriesByDate, state.habits, options)
      typePart = 'habits'
    } else if (type === 'all') {
      // Export both tasks and habits combined
      // For CSV, we'll export tasks by default when 'all' is selected
      // because CSV doesn't support multiple sheets well
      const tasksCsv = exportToCSV(state.tasksByDate, options)
      const habitsCsv = exportHabitsToCSV(state.categoriesByDate, state.habits, options)

      // Combine with a separator
      csvContent = `--- TASKS ---\n${tasksCsv}\n\n--- HABITS ---\n${habitsCsv}`
      typePart = 'data'
    } else {
      // Export only tasks (default)
      csvContent = exportToCSV(state.tasksByDate, options)
      typePart = 'tasks'
    }

    // Generate filename
    const datePart = fromDate && toDate
      ? `_${fromDate}_to_${toDate}`
      : `_${new Date().toISOString().split('T')[0]}`
    const filename = `dailyplanner_${typePart}${datePart}.csv`

    // Return CSV file with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
