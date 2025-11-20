import { NextRequest, NextResponse } from 'next/server'
import { duplicateTask } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { taskId, fromDate, toDate } = body

    if (!taskId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'taskId, fromDate, and toDate are required' },
        { status: 400 }
      )
    }

    // Validate date formats (ISO format: YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const duplicatedTask = await duplicateTask(taskId, fromDate, toDate)

    if (!duplicatedTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(duplicatedTask, { status: 201 })
  } catch (error) {
    console.error('Error in tasks duplicate POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
