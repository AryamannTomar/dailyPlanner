"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Trash2, CheckCircle, CalendarIcon, Copy, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface BulkActionsBarProps {
  selectedCount: number
  onDelete: () => void
  onComplete: () => void
  onMove: (targetDate: string) => void
  onDuplicate: () => void
  onClearSelection: () => void
}

export default function BulkActionsBar({
  selectedCount,
  onDelete,
  onComplete,
  onMove,
  onDuplicate,
  onClearSelection,
}: BulkActionsBarProps) {
  const [moveDate, setMoveDate] = useState<Date | undefined>(undefined)
  const [movePopoverOpen, setMovePopoverOpen] = useState(false)

  const handleMove = () => {
    if (moveDate) {
      const dateISO = format(moveDate, "yyyy-MM-dd")
      onMove(dateISO)
      setMoveDate(undefined)
      setMovePopoverOpen(false)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg mb-3">
      <div className="flex-1 text-sm font-medium">
        {selectedCount} task{selectedCount !== 1 ? "s" : ""} selected
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onComplete}
          className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Complete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDuplicate}
          className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
        >
          <Copy className="h-4 w-4 mr-1" />
          Duplicate
        </Button>

        <Popover open={movePopoverOpen} onOpenChange={setMovePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            >
              <CalendarIcon className="h-4 w-4 mr-1" />
              Move
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-2 border-b">
              <p className="text-sm font-medium">Move to date</p>
              <p className="text-xs text-muted-foreground">Select target date for selected tasks</p>
            </div>
            <Calendar
              mode="single"
              selected={moveDate}
              onSelect={setMoveDate}
              initialFocus
            />
            <div className="p-2 border-t flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMoveDate(undefined)
                  setMovePopoverOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMove}
                disabled={!moveDate}
              >
                Move
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 px-2"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  )
}
