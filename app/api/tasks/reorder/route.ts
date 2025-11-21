import { NextRequest, NextResponse } from 'next/server'
import { reorderTasks } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, taskIds } = body

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    if (!taskIds || !Array.isArray(taskIds)) {
      return NextResponse.json({ error: 'taskIds array is required' }, { status: 400 })
    }

    // Validate all taskIds are strings
    for (const id of taskIds) {
      if (typeof id !== 'string') {
        return NextResponse.json({ error: 'all taskIds must be strings' }, { status: 400 })
      }
    }

    const result = await reorderTasks(date, taskIds)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in tasks reorder PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
