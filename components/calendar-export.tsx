"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Download, Calendar, Loader2 } from "lucide-react"
import { formatISODate, addDays } from "@/lib/date-utils"
import { downloadICS, formatExportDate } from "@/lib/export-utils"
import type { TasksByDate } from "@/lib/types"
import { toast } from "sonner"

interface CalendarExportProps {
  tasksByDate: TasksByDate
}

export default function CalendarExport({ tasksByDate }: CalendarExportProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Default to current week
  const today = new Date()
  const defaultFromDate = formatISODate(addDays(today, -7))
  const defaultToDate = formatISODate(today)

  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(defaultToDate)
  const [includeCompleted, setIncludeCompleted] = useState(true)

  // Calculate task count for selected range
  const getTaskCount = () => {
    let count = 0
    const from = new Date(fromDate + 'T00:00:00')
    const to = new Date(toDate + 'T00:00:00')

    for (const [dateKey, tasks] of Object.entries(tasksByDate)) {
      const date = new Date(dateKey + 'T00:00:00')
      if (date >= from && date <= to) {
        if (includeCompleted) {
          count += tasks.length
        } else {
          count += tasks.filter(t => !t.completed).length
        }
      }
    }
    return count
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Call the API endpoint
      const params = new URLSearchParams({
        fromDate,
        toDate,
        includeCompleted: includeCompleted.toString(),
      })

      const response = await fetch(`/api/export/calendar?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to export calendar')
      }

      const icsContent = await response.text()

      // Generate filename
      const filename = `tasks_${fromDate}_to_${toDate}.ics`

      // Download the file
      downloadICS(icsContent, filename)

      toast.success("Calendar exported", {
        description: `Exported ${getTaskCount()} tasks from ${formatExportDate(fromDate)} to ${formatExportDate(toDate)}`,
      })

      setOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error("Export failed", {
        description: "There was an error exporting your calendar. Please try again.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Quick date range presets
  const setThisWeek = () => {
    const start = addDays(today, -today.getDay())
    setFromDate(formatISODate(start))
    setToDate(formatISODate(addDays(start, 6)))
  }

  const setLastWeek = () => {
    const start = addDays(today, -today.getDay() - 7)
    setFromDate(formatISODate(start))
    setToDate(formatISODate(addDays(start, 6)))
  }

  const setThisMonth = () => {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setFromDate(formatISODate(start))
    setToDate(formatISODate(end))
  }

  const setLast30Days = () => {
    setFromDate(formatISODate(addDays(today, -30)))
    setToDate(formatISODate(today))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Export Calendar
          </DialogTitle>
          <DialogDescription>
            Export your tasks as an ICS file to import into your calendar app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date range selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fromDate" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="toDate" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={setThisWeek}
              className="text-xs h-7"
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setLastWeek}
              className="text-xs h-7"
            >
              Last Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setThisMonth}
              className="text-xs h-7"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={setLast30Days}
              className="text-xs h-7"
            >
              Last 30 Days
            </Button>
          </div>

          {/* Include completed toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="includeCompleted" className="text-sm font-medium">
                Include completed tasks
              </Label>
              <p className="text-xs text-muted-foreground">
                Export tasks that have been marked as done
              </p>
            </div>
            <Switch
              id="includeCompleted"
              checked={includeCompleted}
              onCheckedChange={setIncludeCompleted}
            />
          </div>

          {/* Task count preview */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="text-sm font-medium">
              {getTaskCount()} tasks will be exported
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatExportDate(fromDate)} - {formatExportDate(toDate)}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || getTaskCount() === 0}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export ICS
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Individual task export button component
interface TaskExportButtonProps {
  task: {
    id: string
    description: string
    startTime: string
    approxEndTime: string
    actualEndTime?: string
    completed: boolean
    priority?: "high" | "medium" | "low" | null
    notes?: string | null
    tags?: string[]
    subtasks?: { id: string; description: string; completed: boolean }[]
    links?: { url: string; title: string }[]
  }
  date: string
  variant?: "ghost" | "outline"
  showLabel?: boolean
}

export function TaskExportButton({
  task,
  date,
  variant = "ghost",
  showLabel = false,
}: TaskExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportICS = async () => {
    setIsExporting(true)
    try {
      const { generateSingleTaskICS, downloadICS } = await import('@/lib/export-utils')
      const icsContent = generateSingleTaskICS(task, date)
      const filename = `task_${task.id}.ics`
      downloadICS(icsContent, filename)
      toast.success("Task exported", {
        description: `"${task.description}" exported as ICS file`,
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast.error("Export failed")
    } finally {
      setIsExporting(false)
    }
  }

  const handleAddToGoogleCalendar = async () => {
    try {
      const { generateGoogleCalendarURL } = await import('@/lib/export-utils')
      const url = generateGoogleCalendarURL(task, date)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to open Google Calendar:', error)
      toast.error("Failed to open Google Calendar")
    }
  }

  if (showLabel) {
    return (
      <div className="flex gap-1">
        <Button
          variant={variant}
          size="sm"
          onClick={handleExportICS}
          disabled={isExporting}
          className="gap-1 h-7 text-xs"
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Download className="h-3 w-3" />
          )}
          ICS
        </Button>
        <Button
          variant={variant}
          size="sm"
          onClick={handleAddToGoogleCalendar}
          className="gap-1 h-7 text-xs"
        >
          <Calendar className="h-3 w-3" />
          Google
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-0.5">
      <Button
        variant={variant}
        size="sm"
        onClick={handleExportICS}
        disabled={isExporting}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        title="Download ICS file"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="sr-only">Download ICS</span>
      </Button>
      <Button
        variant={variant}
        size="sm"
        onClick={handleAddToGoogleCalendar}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        title="Add to Google Calendar"
      >
        <Calendar className="h-4 w-4" />
        <span className="sr-only">Add to Google Calendar</span>
      </Button>
    </div>
  )
}
