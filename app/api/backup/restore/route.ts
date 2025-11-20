import { NextRequest, NextResponse } from 'next/server'
import { restoreBackup } from '@/lib/backup-utils'

export const runtime = 'nodejs'

/**
 * POST /api/backup/restore - Restore from a backup
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { backupId } = body

    if (!backupId) {
      return NextResponse.json(
        { error: 'Backup ID is required' },
        { status: 400 }
      )
    }

    const state = await restoreBackup(backupId)

    // Calculate some stats about the restored state
    const taskCount = Object.values(state.tasksByDate).reduce(
      (sum, tasks) => sum + tasks.length,
      0
    )
    const dateCount = Object.keys(state.tasksByDate).length
    const habitCount = state.habits?.length || 0
    const templateCount = state.templates?.length || 0

    return NextResponse.json({
      success: true,
      restored: {
        taskCount,
        dateCount,
        habitCount,
        templateCount,
      },
    })
  } catch (error: any) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to restore backup' },
      { status: 500 }
    )
  }
}
