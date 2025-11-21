import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/state-store'
import { generateICS, type TaskWithDate } from '@/lib/export-utils'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const includeCompleted = searchParams.get('includeCompleted') !== 'false'

    // Validate required parameters
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: fromDate and toDate' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Get all tasks from state
    const state = await getState()
    const { tasksByDate } = state

    // Filter tasks within date range
    const tasksWithDate: TaskWithDate[] = []
    const from = new Date(fromDate + 'T00:00:00')
    const to = new Date(toDate + 'T00:00:00')

    for (const [dateKey, tasks] of Object.entries(tasksByDate)) {
      const date = new Date(dateKey + 'T00:00:00')
      if (date >= from && date <= to) {
        for (const task of tasks) {
          // Filter by completion status if needed
          if (!includeCompleted && task.completed) {
            continue
          }
          tasksWithDate.push({
            ...task,
            date: dateKey,
          })
        }
      }
    }

    // Sort tasks by date and time
    tasksWithDate.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      return a.startTime.localeCompare(b.startTime)
    })

    // Generate ICS content
    const icsContent = generateICS(tasksWithDate, {
      fromDate,
      toDate,
      includeCompleted,
    })

    // Return ICS file with appropriate headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks_${fromDate}_to_${toDate}.ics"`,
      },
    })
  } catch (error) {
    console.error('Error exporting calendar:', error)
    return NextResponse.json(
      { error: 'Failed to export calendar' },
      { status: 500 }
    )
  }
}
