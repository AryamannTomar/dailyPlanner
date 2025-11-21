"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { Task, TaskPriority } from "@/lib/types"
import {
  calculateBlockPosition,
  pixelToTime,
  snapToInterval,
  detectOverlaps,
  getTimelineGaps,
  suggestBreakTimes,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  TIMELINE_HEIGHT,
  PIXELS_PER_HOUR,
  getPriorityBorderColor,
  getPriorityBgColor,
  isCurrentTimeInTimeline,
  getCurrentTimePosition,
  calculateEndTimeFromHeight,
  type TimeSlot,
} from "@/lib/time-blocking-utils"
import { formatTime12h } from "@/lib/time-utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertTriangle,
  Clock,
  Coffee,
  GripVertical,
  Plus,
} from "lucide-react"

type TimeBlockingViewProps = {
  tasks: Task[]
  dateISO: string
  onToggleComplete: (taskId: string, completed: boolean) => void
  onUpdateTask: (taskId: string, updates: { startTime?: string; approxEndTime?: string }) => void
  onCreateTask: (startTime: string, endTime: string) => void
  onDeleteTask: (taskId: string) => void
}

export default function TimeBlockingView({
  tasks,
  dateISO,
  onToggleComplete,
  onUpdateTask,
  onCreateTask,
  onDeleteTask,
}: TimeBlockingViewProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [currentTimePosition, setCurrentTimePosition] = useState(getCurrentTimePosition())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [resizingTask, setResizingTask] = useState<string | null>(null)
  const [resizeStartY, setResizeStartY] = useState<number>(0)
  const [resizeOriginalHeight, setResizeOriginalHeight] = useState<number>(0)
  const [showGaps, setShowGaps] = useState(true)
  const [showBreaks, setShowBreaks] = useState(true)

  // Update current time indicator every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimePosition(getCurrentTimePosition())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Detect overlaps
  const overlaps = useMemo(() => detectOverlaps(tasks), [tasks])
  const overlappingTaskIds = useMemo(() => {
    const ids = new Set<string>()
    overlaps.forEach((o) => {
      ids.add(o.taskId)
      o.overlappingWith.forEach((id) => ids.add(id))
    })
    return ids
  }, [overlaps])

  // Get gaps and break suggestions
  const gaps = useMemo(() => getTimelineGaps(tasks), [tasks])
  const breakSuggestions = useMemo(() => suggestBreakTimes(tasks), [tasks])

  // Generate hour labels
  const hourLabels = useMemo(() => {
    const labels: { hour: number; label: string }[] = []
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      const period = h >= 12 ? "PM" : "AM"
      const hour12 = h % 12 || 12
      labels.push({ hour: h, label: `${hour12} ${period}` })
    }
    return labels
  }, [])

  // Handle drag to create task
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingTask) return
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect) return

    const y = e.clientY - rect.top
    setIsDragging(true)
    setDragStart(y)
    setDragEnd(y)
  }, [resizingTask])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect()
      const y = Math.max(0, Math.min(TIMELINE_HEIGHT, e.clientY - rect.top))
      setDragEnd(y)
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startY = Math.min(dragStart, dragEnd)
      const endY = Math.max(dragStart, dragEnd)

      // Only create if dragged at least 15 minutes (15px minimum)
      if (endY - startY >= 15) {
        const startTime = snapToInterval(pixelToTime(startY))
        const endTime = snapToInterval(pixelToTime(endY))
        onCreateTask(startTime, endTime)
      }
    }

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, onCreateTask])

  // Handle resize
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    taskId: string,
    currentHeight: number
  ) => {
    e.stopPropagation()
    e.preventDefault()
    setResizingTask(taskId)
    setResizeStartY(e.clientY)
    setResizeOriginalHeight(currentHeight)
  }, [])

  useEffect(() => {
    if (!resizingTask) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY
      const newHeight = Math.max(20, resizeOriginalHeight + deltaY)
      const task = tasks.find((t) => t.id === resizingTask)
      if (task) {
        const newEndTime = snapToInterval(
          calculateEndTimeFromHeight(task.startTime, newHeight)
        )
        onUpdateTask(resizingTask, { approxEndTime: newEndTime })
      }
    }

    const handleMouseUp = () => {
      setResizingTask(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizingTask, resizeStartY, resizeOriginalHeight, tasks, onUpdateTask])

  return (
    <Card className="p-4">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showGaps}
              onCheckedChange={(checked) => setShowGaps(Boolean(checked))}
            />
            Show gaps
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showBreaks}
              onCheckedChange={(checked) => setShowBreaks(Boolean(checked))}
            />
            Break suggestions
          </label>
        </div>
        <div className="text-xs text-muted-foreground">
          Click and drag to create a new task
        </div>
      </div>

      {/* Timeline container */}
      <div className="flex">
        {/* Hour labels */}
        <div className="flex-shrink-0 w-16 relative" style={{ height: TIMELINE_HEIGHT }}>
          {hourLabels.map(({ hour, label }) => (
            <div
              key={hour}
              className="absolute right-2 text-xs text-muted-foreground -translate-y-1/2"
              style={{ top: (hour - TIMELINE_START_HOUR) * PIXELS_PER_HOUR }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Timeline grid and tasks */}
        <div
          ref={timelineRef}
          className="flex-1 relative border rounded-lg bg-muted/20"
          style={{ height: TIMELINE_HEIGHT }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Hour grid lines */}
          {hourLabels.map(({ hour }) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-border/50"
              style={{ top: (hour - TIMELINE_START_HOUR) * PIXELS_PER_HOUR }}
            />
          ))}

          {/* Half-hour grid lines (lighter) */}
          {hourLabels.slice(0, -1).map(({ hour }) => (
            <div
              key={`${hour}-30`}
              className="absolute left-0 right-0 border-t border-border/20"
              style={{ top: (hour - TIMELINE_START_HOUR) * PIXELS_PER_HOUR + PIXELS_PER_HOUR / 2 }}
            />
          ))}

          {/* Gap indicators */}
          {showGaps && gaps.map((gap, index) => {
            const { top, height } = calculateBlockPosition(gap.startTime, gap.endTime)
            if (height < 20) return null
            return (
              <Tooltip key={`gap-${index}`}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute left-1 right-1 bg-emerald-50/50 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-800 rounded cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 transition-colors"
                    style={{ top, height }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateTask(gap.startTime, gap.endTime)
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Plus className="h-3 w-3" />
                        <span>{Math.round(gap.durationMinutes)}m free</span>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to create task ({formatTime12h(gap.startTime)} - {formatTime12h(gap.endTime)})</p>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Break suggestions */}
          {showBreaks && breakSuggestions.map((breakSlot, index) => {
            const { top, height } = calculateBlockPosition(breakSlot.startTime, breakSlot.endTime)
            return (
              <Tooltip key={`break-${index}`}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute left-1 right-1 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-sm flex items-center justify-center pointer-events-none"
                    style={{ top, height }}
                  >
                    <Coffee className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Suggested break ({breakSlot.durationMinutes}m)</p>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Task blocks */}
          {tasks.map((task) => {
            const { top, height } = calculateBlockPosition(task.startTime, task.approxEndTime)
            const hasOverlap = overlappingTaskIds.has(task.id)

            return (
              <div
                key={task.id}
                className={cn(
                  "absolute left-2 right-2 rounded-md border-l-4 shadow-sm cursor-pointer transition-all",
                  "hover:shadow-md hover:z-10",
                  getPriorityBorderColor(task.priority),
                  getPriorityBgColor(task.priority),
                  task.completed && "opacity-60",
                  hasOverlap && "ring-2 ring-red-500/50 bg-red-50 dark:bg-red-950/30"
                )}
                style={{ top, height: Math.max(height, 24) }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-full p-2 flex flex-col overflow-hidden">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => onToggleComplete(task.id, Boolean(checked))}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-xs font-medium truncate",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.description}
                      </div>
                      {height >= 40 && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime12h(task.startTime)} - {formatTime12h(task.approxEndTime)}
                        </div>
                      )}
                    </div>
                    {hasOverlap && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This task overlaps with another</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Priority badge */}
                  {task.priority && height >= 50 && (
                    <div className="mt-auto">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        task.priority === "high" && "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
                        task.priority === "medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
                        task.priority === "low" && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      )}>
                        {task.priority}
                      </span>
                    </div>
                  )}
                </div>

                {/* Resize handle */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex items-center justify-center group"
                  onMouseDown={(e) => handleResizeStart(e, task.id, height)}
                >
                  <div className="w-8 h-1 rounded-full bg-border group-hover:bg-muted-foreground/50 transition-colors" />
                </div>
              </div>
            )
          })}

          {/* Current time indicator */}
          {isCurrentTimeInTimeline() && (
            <div
              className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          )}

          {/* Drag selection overlay */}
          {isDragging && dragStart !== null && dragEnd !== null && (
            <div
              className="absolute left-2 right-2 bg-primary/20 border-2 border-primary border-dashed rounded-md pointer-events-none z-30"
              style={{
                top: Math.min(dragStart, dragEnd),
                height: Math.abs(dragEnd - dragStart),
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {snapToInterval(pixelToTime(Math.min(dragStart, dragEnd)))} -{" "}
                  {snapToInterval(pixelToTime(Math.max(dragStart, dragEnd)))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/30 rounded-sm" />
          <span>High priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 rounded-sm" />
          <span>Medium priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-sm" />
          <span>Low priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 rounded-sm" />
          <span>No priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span>Overlap warning</span>
        </div>
      </div>
    </Card>
  )
}
