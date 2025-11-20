"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CheckSquare,
  RefreshCw,
  Minus,
  Maximize2,
  Plus,
  Clock,
} from "lucide-react"
import type { Task } from "@/lib/types"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface QuickTasksWidgetProps {
  tasks: Task[]
  dateISO: string
  size: WidgetSize
  minimized: boolean
  onToggleComplete: (taskId: string, completed: boolean) => void
  onRefresh: () => void
  onMinimize: () => void
  onQuickAdd?: () => void
}

export function QuickTasksWidget({
  tasks,
  dateISO,
  size,
  minimized,
  onToggleComplete,
  onRefresh,
  onMinimize,
  onQuickAdd,
}: QuickTasksWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    // Incomplete first, then by time
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.startTime.localeCompare(b.startTime)
  })

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount}</span>
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-500" />
            Today&apos;s Tasks
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-6 w-6 p-0"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} completed
          </span>
          <span className="text-xs font-medium text-emerald-600">{progressPercent}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3 overflow-hidden">
        <ScrollArea className={cn(
          "pr-2",
          size === 'small' ? "h-[100px]" : size === 'medium' ? "h-[180px]" : "h-[280px]"
        )}>
          {sortedTasks.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No tasks for today
            </div>
          ) : (
            <div className="space-y-2">
              {sortedTasks.map(task => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg transition-colors",
                    task.completed ? "bg-muted/50" : "bg-background hover:bg-muted/30"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => onToggleComplete(task.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.description}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {task.startTime.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {onQuickAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={onQuickAdd}
            className="w-full mt-2 h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Task
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
