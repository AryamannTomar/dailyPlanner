import { NextRequest, NextResponse } from 'next/server'
import {
  bulkDeleteTasks,
  bulkCompleteTasks,
  bulkMoveTasks,
  bulkDuplicateTasks
} from '@/lib/state-store'

export const runtime = 'nodejs'

type BulkAction = 'delete' | 'complete' | 'move' | 'duplicate'

interface BulkRequestBody {
  action: BulkAction
  taskIds: string[]
  date: string
  targetDate?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: BulkRequestBody = await req.json()
    const { action, taskIds, date, targetDate } = body

    // Validate required fields
    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds must be a non-empty array' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Validate action type
    const validActions: BulkAction[] = ['delete', 'complete', 'move', 'duplicate']
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`
      }, { status: 400 })
    }

    // Handle each action type
    switch (action) {
      case 'delete': {
        const result = await bulkDeleteTasks(date, taskIds)
        return NextResponse.json({
          success: true,
          action: 'delete',
          ...result
        })
      }

      case 'complete': {
        const result = await bulkCompleteTasks(date, taskIds)
        return NextResponse.json({
          success: true,
          action: 'complete',
          ...result
        })
      }

      case 'move': {
        if (!targetDate) {
          return NextResponse.json({
            error: 'targetDate is required for move action'
          }, { status: 400 })
        }
        const result = await bulkMoveTasks(date, targetDate, taskIds)
        return NextResponse.json({
          success: true,
          action: 'move',
          fromDate: date,
          toDate: targetDate,
          ...result
        })
      }

      case 'duplicate': {
        const result = await bulkDuplicateTasks(date, taskIds)
        return NextResponse.json({
          success: true,
          action: 'duplicate',
          duplicatedCount: result.duplicatedTasks.length,
          ...result
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk tasks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
