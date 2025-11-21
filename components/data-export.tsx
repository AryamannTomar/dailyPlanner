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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react"
import { formatISODate, addDays } from "@/lib/date-utils"
import {
  downloadFile,
  generateExportFilename,
  countTasksInRange,
  countHabitEntriesInRange
} from "@/lib/data-export-utils"
import type { TasksByDate, CategoriesByDate, HabitDefinition } from "@/lib/types"
import { toast } from "sonner"

type ExportFormat = 'json' | 'csv'
type DataType = 'all' | 'tasks' | 'habits'

interface DataExportProps {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
}

export default function DataExport({
  tasksByDate,
  categoriesByDate,
  habits
}: DataExportProps) {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('json')
  const [dataType, setDataType] = useState<DataType>('all')

  // Default to last 30 days
  const today = new Date()
  const defaultFromDate = formatISODate(addDays(today, -30))
  const defaultToDate = formatISODate(today)

  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(defaultToDate)

  // Calculate counts for selected range
  const getTaskCount = () => {
    return countTasksInRange(tasksByDate, fromDate, toDate)
  }

  const getHabitCount = () => {
    return countHabitEntriesInRange(categoriesByDate, habits, fromDate, toDate)
  }

  const getExportDescription = () => {
    if (dataType === 'all') {
      return `${getTaskCount()} tasks and ${getHabitCount()} habit entries`
    } else if (dataType === 'tasks') {
      return `${getTaskCount()} tasks`
    } else {
      return `${getHabitCount()} habit entries`
    }
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const params = new URLSearchParams({
        type: dataType,
        fromDate,
        toDate,
      })

      const endpoint = format === 'json' ? '/api/export/json' : '/api/export/csv'
      const response = await fetch(`${endpoint}?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to export data')
      }

      const content = await response.text()
      const filename = generateExportFilename(format, dataType, fromDate, toDate)
      const mimeType = format === 'json' ? 'application/json' : 'text/csv'

      downloadFile(content, filename, mimeType)

      toast.success("Data exported successfully", {
        description: `Exported ${getExportDescription()} to ${filename}`,
      })

      setOpen(false)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "Please try again.",
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

  const setAllTime = () => {
    // Find earliest and latest dates in data
    const allDates = [
      ...Object.keys(tasksByDate),
      ...Object.keys(categoriesByDate)
    ].sort()

    if (allDates.length > 0) {
      setFromDate(allDates[0])
      setToDate(allDates[allDates.length - 1])
    }
  }

  const hasData = getTaskCount() > 0 || getHabitCount() > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileJson className="h-4 w-4" />
          <span className="hidden sm:inline">Export Data</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export your tasks and habits as JSON or CSV files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export format selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Export Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON - Full data with structure
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV - Spreadsheet compatible
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data type selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data to Export</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="tasks">Tasks Only</SelectItem>
                <SelectItem value="habits">Habits Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exportFromDate" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="exportFromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="exportToDate" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="exportToDate"
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
            <Button
              variant="outline"
              size="sm"
              onClick={setAllTime}
              className="text-xs h-7"
            >
              All Time
            </Button>
          </div>

          {/* Export preview */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="text-sm font-medium">
              {getExportDescription()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {new Date(fromDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })} - {new Date(toDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            {!hasData && (
              <div className="text-xs text-amber-600 mt-2">
                No data found in selected range
              </div>
            )}
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
            disabled={isExporting || !hasData}
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
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
