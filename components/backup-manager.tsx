"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Archive,
  Clock,
  Download,
  HardDrive,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Settings2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface BackupMetadata {
  id: string
  filename: string
  timestamp: string
  size: number
  taskCount: number
  dateCount: number
  habitCount: number
  templateCount: number
}

interface BackupConfig {
  autoBackupEnabled: boolean
  maxBackups: number
  lastAutoBackup: string | null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
}

function formatBackupTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function getRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) {
    return "just now"
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return formatBackupTimestamp(timestamp)
  }
}

interface BackupManagerProps {
  onRestore?: () => void
}

export default function BackupManager({ onRestore }: BackupManagerProps) {
  const [open, setOpen] = useState(false)
  const [backups, setBackups] = useState<BackupMetadata[]>([])
  const [config, setConfig] = useState<BackupConfig>({
    autoBackupEnabled: false,
    maxBackups: 10,
    lastAutoBackup: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreBackupId, setRestoreBackupId] = useState<string | null>(null)
  const [deleteBackupId, setDeleteBackupId] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const loadBackups = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/backup")
      if (!res.ok) throw new Error("Failed to load backups")
      const data = await res.json()
      setBackups(data.backups || [])
      setConfig(data.config || config)
    } catch (error) {
      console.error("Error loading backups:", error)
      toast.error("Failed to load backups")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadBackups()
    }
  }, [open, loadBackups])

  const handleCreateBackup = async () => {
    setIsCreating(true)
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Failed to create backup")
      const data = await res.json()
      toast.success("Backup created", {
        description: `${data.backup.taskCount} tasks backed up`,
      })
      loadBackups()
    } catch (error) {
      console.error("Error creating backup:", error)
      toast.error("Failed to create backup")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async () => {
    if (!restoreBackupId) return

    setIsRestoring(true)
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId: restoreBackupId }),
      })
      if (!res.ok) throw new Error("Failed to restore backup")
      const data = await res.json()
      toast.success("Backup restored", {
        description: `Restored ${data.restored.taskCount} tasks`,
      })
      setRestoreBackupId(null)
      onRestore?.()
      // Refresh the page to load restored data
      window.location.reload()
    } catch (error) {
      console.error("Error restoring backup:", error)
      toast.error("Failed to restore backup")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteBackupId) return

    try {
      const res = await fetch(`/api/backup?id=${encodeURIComponent(deleteBackupId)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete backup")
      toast.success("Backup deleted")
      setDeleteBackupId(null)
      loadBackups()
    } catch (error) {
      console.error("Error deleting backup:", error)
      toast.error("Failed to delete backup")
    }
  }

  const handleUpdateConfig = async (updates: Partial<BackupConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)

    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: updates }),
      })
      if (!res.ok) throw new Error("Failed to update config")
      toast.success("Settings updated")
    } catch (error) {
      console.error("Error updating config:", error)
      toast.error("Failed to update settings")
      // Revert on error
      loadBackups()
    }
  }

  const latestBackup = backups[0]
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0)

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Backup Manager">
                <Archive className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Backup Manager</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Backup Manager
            </DialogTitle>
            <DialogDescription>
              Create, restore, and manage backups of your planner data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats & Quick Actions */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {backups.length} backup{backups.length !== 1 ? "s" : ""} ({formatFileSize(totalSize)})
                  </span>
                </div>
                {latestBackup && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Last backup: {getRelativeTime(latestBackup.timestamp)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                <Button onClick={handleCreateBackup} disabled={isCreating} className="gap-2">
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Create Backup
                </Button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-backup">Auto-backup</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically create daily backups
                    </p>
                  </div>
                  <Switch
                    id="auto-backup"
                    checked={config.autoBackupEnabled}
                    onCheckedChange={(checked) =>
                      handleUpdateConfig({ autoBackupEnabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-backups">Maximum backups to keep</Label>
                  <Input
                    id="max-backups"
                    type="number"
                    min={1}
                    max={50}
                    value={config.maxBackups}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (value >= 1 && value <= 50) {
                        handleUpdateConfig({ maxBackups: value })
                      }
                    }}
                    className="w-24"
                  />
                  <p className="text-xs text-muted-foreground">
                    Older backups will be automatically deleted
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Backup List */}
            <div>
              <h4 className="text-sm font-medium mb-3">Available Backups</h4>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No backups yet</p>
                  <p className="text-xs">Create your first backup to protect your data</p>
                </div>
              ) : (
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-2">
                    {backups.map((backup, index) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatBackupTimestamp(backup.timestamp)}
                            </span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {backup.taskCount} tasks
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {backup.dateCount} days
                            </span>
                            <span>{formatFileSize(backup.size)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRestoreBackupId(backup.id)}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteBackupId(backup.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreBackupId} onOpenChange={() => setRestoreBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restore Backup?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your current data with the backup. A new backup will be
              created automatically before restoring. The page will reload after restoration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={isRestoring}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteBackupId} onOpenChange={() => setDeleteBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This backup will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
