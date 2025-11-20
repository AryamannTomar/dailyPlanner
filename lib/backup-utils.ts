import { promises as fs } from 'fs'
import path from 'path'
import type { AppState } from '@/lib/state-store'
import { getState, saveState } from '@/lib/state-store'

const DATA_DIR = path.join(process.cwd(), 'data')
const BACKUPS_DIR = path.join(DATA_DIR, 'backups')

export interface BackupMetadata {
  id: string
  filename: string
  timestamp: string
  size: number
  taskCount: number
  dateCount: number
  habitCount: number
  templateCount: number
}

export interface BackupConfig {
  autoBackupEnabled: boolean
  maxBackups: number
  lastAutoBackup: string | null
}

const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  autoBackupEnabled: false,
  maxBackups: 10,
  lastAutoBackup: null,
}

/**
 * Ensure the backups directory exists
 */
async function ensureBackupsDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true })
  } catch {}
}

/**
 * Generate a backup filename with timestamp
 */
function generateBackupFilename(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `backup-${year}-${month}-${day}-${hours}${minutes}${seconds}.json`
}

/**
 * Extract backup ID from filename
 */
function getBackupId(filename: string): string {
  return filename.replace('.json', '')
}

/**
 * Parse backup timestamp from filename
 */
function parseBackupTimestamp(filename: string): string {
  const match = filename.match(/backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(\d{2})\.json/)
  if (match) {
    const [, year, month, day, hours, minutes, seconds] = match
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    ).toISOString()
  }
  return new Date().toISOString()
}

/**
 * Get backup configuration
 */
export async function getBackupConfig(): Promise<BackupConfig> {
  const configPath = path.join(DATA_DIR, 'backup-config.json')
  try {
    const data = await fs.readFile(configPath, 'utf8')
    return { ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(data) }
  } catch {
    return DEFAULT_BACKUP_CONFIG
  }
}

/**
 * Save backup configuration
 */
export async function saveBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
  const configPath = path.join(DATA_DIR, 'backup-config.json')
  const current = await getBackupConfig()
  const updated = { ...current, ...config }
  await fs.writeFile(configPath, JSON.stringify(updated, null, 2), 'utf8')
  return updated
}

/**
 * Create a backup of the current state
 */
export async function createBackup(): Promise<BackupMetadata> {
  await ensureBackupsDir()

  const state = await getState()
  const filename = generateBackupFilename()
  const filepath = path.join(BACKUPS_DIR, filename)

  // Calculate metadata
  const taskCount = Object.values(state.tasksByDate).reduce(
    (sum, tasks) => sum + tasks.length,
    0
  )
  const dateCount = Object.keys(state.tasksByDate).length
  const habitCount = state.habits?.length || 0
  const templateCount = state.templates?.length || 0

  const json = JSON.stringify(state, null, 2)
  await fs.writeFile(filepath, json, 'utf8')

  const stats = await fs.stat(filepath)

  // Clean up old backups if needed
  const config = await getBackupConfig()
  await cleanupOldBackups(config.maxBackups)

  return {
    id: getBackupId(filename),
    filename,
    timestamp: parseBackupTimestamp(filename),
    size: stats.size,
    taskCount,
    dateCount,
    habitCount,
    templateCount,
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  await ensureBackupsDir()

  try {
    const files = await fs.readdir(BACKUPS_DIR)
    const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'))

    const backups: BackupMetadata[] = await Promise.all(
      backupFiles.map(async (filename) => {
        const filepath = path.join(BACKUPS_DIR, filename)
        const stats = await fs.stat(filepath)

        // Read file to get metadata
        let taskCount = 0
        let dateCount = 0
        let habitCount = 0
        let templateCount = 0

        try {
          const data = await fs.readFile(filepath, 'utf8')
          const state: AppState = JSON.parse(data)
          taskCount = Object.values(state.tasksByDate || {}).reduce(
            (sum, tasks) => sum + tasks.length,
            0
          )
          dateCount = Object.keys(state.tasksByDate || {}).length
          habitCount = state.habits?.length || 0
          templateCount = state.templates?.length || 0
        } catch {}

        return {
          id: getBackupId(filename),
          filename,
          timestamp: parseBackupTimestamp(filename),
          size: stats.size,
          taskCount,
          dateCount,
          habitCount,
          templateCount,
        }
      })
    )

    // Sort by timestamp (newest first)
    return backups.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  } catch {
    return []
  }
}

/**
 * Restore from a backup
 */
export async function restoreBackup(backupId: string): Promise<AppState> {
  const filename = `${backupId}.json`
  const filepath = path.join(BACKUPS_DIR, filename)

  try {
    const data = await fs.readFile(filepath, 'utf8')
    const state: AppState = JSON.parse(data)

    // Validate the backup data structure
    if (!state.tasksByDate || typeof state.tasksByDate !== 'object') {
      throw new Error('Invalid backup: missing tasksByDate')
    }

    // Ensure backward compatibility
    if (!state.categoriesByDate) {
      state.categoriesByDate = {}
    }
    if (!state.habits) {
      state.habits = []
    }
    if (!state.templates) {
      state.templates = []
    }

    // Create a backup before restoring (safety measure)
    await createBackup()

    // Restore the state
    await saveState(state)

    return state
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(`Backup not found: ${backupId}`)
    }
    throw err
  }
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string): Promise<boolean> {
  const filename = `${backupId}.json`
  const filepath = path.join(BACKUPS_DIR, filename)

  try {
    await fs.unlink(filepath)
    return true
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return false
    }
    throw err
  }
}

/**
 * Clean up old backups to maintain maxBackups limit
 */
async function cleanupOldBackups(maxBackups: number): Promise<void> {
  const backups = await listBackups()

  if (backups.length > maxBackups) {
    // Sort by timestamp (oldest first for deletion)
    const toDelete = backups
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(0, backups.length - maxBackups)

    await Promise.all(toDelete.map(backup => deleteBackup(backup.id)))
  }
}

/**
 * Create automatic backup if needed (once per day)
 */
export async function autoBackup(): Promise<BackupMetadata | null> {
  const config = await getBackupConfig()

  if (!config.autoBackupEnabled) {
    return null
  }

  const today = new Date().toISOString().split('T')[0]

  // Check if we already did an auto-backup today
  if (config.lastAutoBackup === today) {
    return null
  }

  // Create backup
  const backup = await createBackup()

  // Update last auto-backup date
  await saveBackupConfig({ lastAutoBackup: today })

  return backup
}

/**
 * Create a pre-operation backup (before import, bulk delete, etc.)
 */
export async function createPreOperationBackup(operation: string): Promise<BackupMetadata> {
  // This creates a regular backup but could be tagged differently in the future
  const backup = await createBackup()
  return backup
}

/**
 * Get backup by ID
 */
export async function getBackup(backupId: string): Promise<BackupMetadata | null> {
  const backups = await listBackups()
  return backups.find(b => b.id === backupId) || null
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

/**
 * Format timestamp for display
 */
export function formatBackupTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    return formatBackupTimestamp(timestamp)
  }
}
