"use client"

import { useState } from "react"
import type { Task } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowRight, Calendar, Clock, Trash2 } from "lucide-react"

type CarryOverDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: Task[]
  fromDate: string
  toDate: string
  onCarryOver: (taskIds: string[], deleteOriginals: boolean) => Promise<void>
}

export default function CarryOverDialog({
  open,
  onOpenChange,
  tasks,
  fromDate,
  toDate,
  onCarryOver,
}: CarryOverDialogProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(
    new Set(tasks.map(t => t.id))
  )
  const [deleteOriginals, setDeleteOriginals] = useState<boolean>(true)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const handleToggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedTasks(new Set(tasks.map(t => t.id)))
  }

  const handleSelectNone = () => {
    setSelectedTasks(new Set())
  }

  const handleCarrySelected = async () => {
    if (selectedTasks.size === 0) return
    setIsLoading(true)
    try {
      await onCarryOver(Array.from(selectedTasks), deleteOriginals)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to carry over tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCarryAll = async () => {
    setIsLoading(true)
    try {
      await onCarryOver(tasks.map(t => t.id), deleteOriginals)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to carry over tasks:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Carry Over Incomplete Tasks
          </DialogTitle>
          <DialogDescription>
            You have {tasks.length} incomplete task{tasks.length !== 1 ? "s" : ""} from{" "}
            {formatDate(fromDate)}. Would you like to move them to today?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <span className="font-medium">{formatDate(fromDate)}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium">{formatDate(toDate)}</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Select tasks ({selectedTasks.size}/{tasks.length})
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectNone}
                className="h-7 text-xs"
              >
                None
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[200px] rounded-md border">
            <div className="p-3 space-y-2">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                    selectedTasks.has(task.id)
                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleToggleTask(task.id)}
                >
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => handleToggleTask(task.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.startTime} - {task.approxEndTime}
                      </span>
                      {task.priority && (
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {task.subtasks.filter(s => s.completed).length}/
                        {task.subtasks.length} subtasks
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              <Label
                htmlFor="delete-originals"
                className="text-sm cursor-pointer"
              >
                Delete original tasks after carry-over
              </Label>
            </div>
            <Switch
              id="delete-originals"
              checked={deleteOriginals}
              onCheckedChange={setDeleteOriginals}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Dismiss
          </Button>
          <Button
            variant="outline"
            onClick={handleCarrySelected}
            disabled={isLoading || selectedTasks.size === 0}
          >
            {isLoading ? "Carrying..." : `Carry Selected (${selectedTasks.size})`}
          </Button>
          <Button
            onClick={handleCarryAll}
            disabled={isLoading || tasks.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? "Carrying..." : `Carry All (${tasks.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// CarryOverBanner component for showing a notification/banner
export function CarryOverBanner({
  taskCount,
  onOpen,
  onDismiss,
}: {
  taskCount: number
  onOpen: () => void
  onDismiss: () => void
}) {
  if (taskCount === 0) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          You have {taskCount} incomplete task{taskCount !== 1 ? "s" : ""} from
          yesterday
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300"
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          onClick={onOpen}
          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
        >
          Carry Over
        </Button>
      </div>
    </div>
  )
}
