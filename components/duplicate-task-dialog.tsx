"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CalendarDays, Copy, Clock, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatISODate, toLabelDate } from "@/lib/date-utils"
import { formatTime12h } from "@/lib/time-utils"
import type { Task } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

type DuplicateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  sourceDate: string
  onDuplicate: (taskId: string, fromDate: string, toDates: string[]) => void
}

export default function DuplicateTaskDialog({
  open,
  onOpenChange,
  task,
  sourceDate,
  onDuplicate,
}: DuplicateTaskDialogProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [multipleMode, setMultipleMode] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    if (multipleMode) {
      setSelectedDates((prev) => {
        const dateStr = formatISODate(date)
        const exists = prev.some((d) => formatISODate(d) === dateStr)
        if (exists) {
          return prev.filter((d) => formatISODate(d) !== dateStr)
        }
        return [...prev, date]
      })
    } else {
      setSelectedDates([date])
      setIsCalendarOpen(false)
    }
  }

  const handleDuplicate = () => {
    if (!task || selectedDates.length === 0) return

    const toDates = selectedDates.map(formatISODate)
    onDuplicate(task.id, sourceDate, toDates)

    // Reset state
    setSelectedDates([])
    setMultipleMode(false)
    onOpenChange(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setSelectedDates([])
      setMultipleMode(false)
    }
    onOpenChange(isOpen)
  }

  if (!task) return null

  const startLabel = formatTime12h(task.startTime)
  const approxLabel = formatTime12h(task.approxEndTime)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Task
          </DialogTitle>
          <DialogDescription>
            Select a date to duplicate this task to
          </DialogDescription>
        </DialogHeader>

        {/* Task Preview */}
        <div className="rounded-lg border p-3 bg-muted/50">
          <div className="font-medium text-sm mb-2">{task.description}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{startLabel} - {approxLabel}</span>
            </div>
            {task.priority && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {task.priority}
              </Badge>
            )}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2">
              {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Multiple dates toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multiple-dates"
            checked={multipleMode}
            onCheckedChange={(checked) => {
              setMultipleMode(Boolean(checked))
              if (!checked && selectedDates.length > 1) {
                setSelectedDates([selectedDates[0]])
              }
            }}
          />
          <Label htmlFor="multiple-dates" className="text-sm cursor-pointer">
            Duplicate to multiple dates
          </Label>
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {multipleMode ? "Select dates" : "Select date"}
          </Label>

          {multipleMode ? (
            // Show inline calendar for multiple selection
            <div className="border rounded-lg p-2">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                className="mx-auto"
              />
            </div>
          ) : (
            // Show popover for single selection
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDates[0] && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedDates[0] ? toLabelDate(selectedDates[0]) : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDates[0]}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Selected dates display for multiple mode */}
          {multipleMode && selectedDates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedDates
                .sort((a, b) => a.getTime() - b.getTime())
                .map((date) => (
                  <Badge
                    key={formatISODate(date)}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => {
                      setSelectedDates((prev) =>
                        prev.filter((d) => formatISODate(d) !== formatISODate(date))
                      )
                    }}
                  >
                    {toLabelDate(date)} x
                  </Badge>
                ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            disabled={selectedDates.length === 0}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {multipleMode && selectedDates.length > 1
              ? `Copy to ${selectedDates.length} dates`
              : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
