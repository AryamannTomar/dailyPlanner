import { NextRequest, NextResponse } from 'next/server'
import {
  listBackups,
  createBackup,
  deleteBackup,
  getBackupConfig,
  saveBackupConfig,
  autoBackup,
} from '@/lib/backup-utils'

export const runtime = 'nodejs'

/**
 * GET /api/backup - List all backups or get config
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    if (action === 'config') {
      const config = await getBackupConfig()
      return NextResponse.json({ config })
    }

    if (action === 'auto') {
      // Trigger auto-backup check
      const backup = await autoBackup()
      if (backup) {
        return NextResponse.json({ backup, message: 'Auto backup created' })
      }
      return NextResponse.json({ backup: null, message: 'No auto backup needed' })
    }

    const backups = await listBackups()
    const config = await getBackupConfig()
    return NextResponse.json({ backups, config })
  } catch (error: any) {
    console.error('Error listing backups:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list backups' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/backup - Create a new backup or update config
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    // Update config
    if (body.config) {
      const config = await saveBackupConfig(body.config)
      return NextResponse.json({ config })
    }

    // Create backup
    const backup = await createBackup()
    return NextResponse.json({ backup })
  } catch (error: any) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create backup' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/backup - Delete a backup
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const backupId = searchParams.get('id')

  if (!backupId) {
    return NextResponse.json(
      { error: 'Backup ID is required' },
      { status: 400 }
    )
  }

  try {
    const success = await deleteBackup(backupId)

    if (!success) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting backup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete backup' },
      { status: 500 }
    )
  }
}
