"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Task, Subtask } from "@/lib/types"
import { cn } from "@/lib/utils"
import { computeDeltaFromApprox, formatDurationHuman, formatTime12h, getCompletionStatus } from "@/lib/time-utils"
import { formatDeltaTime, getStatusColor, getStatusBgColor, type EstimationStatus } from "@/lib/estimation-utils"
import { Pencil, Trash2, Clock, CheckCircle, AlertCircle, Timer as TimerIcon, Circle, CircleDot, ChevronDown, ListChecks, StickyNote, ChevronUp, Link2, ExternalLink, BookmarkPlus, Copy, Repeat, GripVertical, Search, Target, Timer, CalendarRange } from "lucide-react"
import { getTaskProgress, getTaskDayPosition, formatDateRange } from "@/lib/multiday-utils"
import { getMatchRanges } from "@/lib/search-utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import SubtaskList from "@/components/subtask-list"
import { Badge } from "@/components/ui/badge"
import { formatRecurrencePattern } from "@/lib/recurrence-utils"
import { TaskExportButton } from "@/components/calendar-export"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// Tag colors for visual variety - hash tag name to pick color
const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
]

function getTagColor(tag: string): string {
  // Simple hash function to get consistent color for each tag
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// Simple markdown renderer for notes (bold, italic, links)
function renderMarkdown(text: string): React.ReactNode {
  // Split by markdown patterns and render
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Check for links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:text-primary/80"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Check for bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Check for italic *text* or _text_
    const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/)
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Take one character at a time
    parts.push(remaining[0])
    remaining = remaining.slice(1)
  }

  return parts
}

// Helper function to get priority order for sorting (high=0, medium=1, low=2, null=3)
function getPriorityOrder(priority: "high" | "medium" | "low" | null | undefined): number {
  switch (priority) {
    case "high": return 0
    case "medium": return 1
    case "low": return 2
    default: return 3
  }
}

// Priority badge component
function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" | null | undefined }) {
  if (!priority) return null

  const config = {
    high: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      label: "High"
    },
    medium: {
      icon: Circle,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      label: "Medium"
    },
    low: {
      icon: CircleDot,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      label: "Low"
    }
  }

  const { icon: Icon, color, bgColor, label } = config[priority]

  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", bgColor, color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

// Highlight text with search matches
function HighlightedText({ text, query }: { text: string; query?: string }) {
  if (!query || !query.trim()) {
    return <>{text}</>
  }

  const ranges = getMatchRanges(text, query)
  if (ranges.length === 0) {
    return <>{text}</>
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const range of ranges) {
    // Add text before the match
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start))
    }
    // Add the highlighted match
    parts.push(
      <mark
        key={key++}
        className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground rounded-sm px-0.5"
      >
        {text.slice(range.start, range.end)}
      </mark>
    )
    lastIndex = range.end
  }

  // Add any remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

// Sortable task item wrapper
function SortableTaskItem({
  id,
  children,
  isDragDisabled = false,
}: {
  id: string
  children: (props: { dragHandleProps: React.HTMLAttributes<HTMLDivElement>; isDragging: boolean }) => React.ReactNode
  isDragDisabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isDragDisabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  const dragHandleProps = {
    ...attributes,
    ...listeners,
  }

  return (
    <li ref={setNodeRef} style={style}>
      {children({ dragHandleProps, isDragging })}
    </li>
  )
}

export default function TaskList({
  tasks = [],
  onToggleComplete,
  onUpdateEndTime,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onUpdateNotes,
  onSaveAsTemplate,
  onDuplicate,
  onReorder,
  selectionMode = false,
  selectedTaskIds = new Set(),
  onToggleTaskSelection,
  onFocus,
  onStartPomodoro,
  onSelectAll,
  searchQuery,
  currentDate,
}: {
  tasks?: Task[]
  onToggleComplete: (taskId: string, completed: boolean) => void
  onUpdateEndTime: (taskId: string, newEndTime: string) => void
  onDelete: (taskId: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void
  onAddSubtask: (taskId: string, description: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onUpdateNotes: (taskId: string, notes: string | null) => void
  onSaveAsTemplate?: (task: Task) => void
  onDuplicate?: (task: Task) => void
  onReorder?: (taskIds: string[]) => void
  selectionMode?: boolean
  selectedTaskIds?: Set<string>
  onToggleTaskSelection?: (taskId: string) => void
  onSelectAll?: (selectAll: boolean) => void
  onFocus?: (taskId: string) => void
  onStartPomodoro?: (taskId: string, taskDescription: string) => void
  searchQuery?: string
  currentDate?: string // ISO date string for calculating multi-day progress
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>("")
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [editingNotesValue, setEditingNotesValue] = useState<string>("")
  const [notesExpanded, setNotesExpanded] = useState<Set<string>>(new Set())
  const [linksExpanded, setLinksExpanded] = useState<Set<string>>(new Set())

  const MAX_NOTES_LENGTH = 500

  const toggleLinksExpanded = (taskId: string) => {
    setLinksExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const toggleNotesExpanded = (taskId: string) => {
    setNotesExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-card">
        {"No tasks yet. Add your first task for this day."}
      </div>
    )
  }

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort tasks: by order first if present, then by start time, then by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    // If both have order, sort by order
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order
    }
    // If only one has order, it comes first
    if (a.order !== undefined) return -1
    if (b.order !== undefined) return 1

    // Fall back to start time
    const startA = (a as any).startTime ?? (a as any).time ?? ""
    const startB = (b as any).startTime ?? (b as any).time ?? ""

    if (startA < startB) return -1
    if (startA > startB) return 1

    // If same start time, sort by priority (high first)
    return getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
  })

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex((task) => task.id === active.id)
      const newIndex = sortedTasks.findIndex((task) => task.id === over.id)

      const newOrder = arrayMove(sortedTasks, oldIndex, newIndex)
      const taskIds = newOrder.map((task) => task.id)

      onReorder?.(taskIds)
    }
  }

  const allSelected = tasks.length > 0 && tasks.every(t => selectedTaskIds.has(t.id))
  const someSelected = tasks.some(t => selectedTaskIds.has(t.id))

  return (
    <div className="space-y-2">
      {/* Select All header when in selection mode */}
      {selectionMode && tasks.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll?.(Boolean(checked))}
            aria-label="Select all tasks"
            className="border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
          />
          <span className="text-sm font-medium">
            {allSelected ? "Deselect all" : "Select all"}
          </span>
          {someSelected && (
            <span className="text-xs text-muted-foreground ml-auto">
              {selectedTaskIds.size} selected
            </span>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {sortedTasks.map((task) => {
          const start = (task as any).startTime ?? (task as any).time ?? ""
          const approx = (task as any).approxEndTime ?? ""
          const end = task.actualEndTime
          const diffLabel = typeof task.durationSeconds === "number" ? formatDurationHuman(task.durationSeconds) : ""
          const startLabel = formatTime12h(start)
          const approxLabel = formatTime12h(approx)
          const endLabel = end ? formatTime12h(end) : ""

          // Get completion status with proper icons and colors
          const completionStatus = getCompletionStatus(approx, end || "")
          const deltaHuman = completionStatus.delta ? formatDurationHuman(completionStatus.delta) : ""

          const isEditing = editingId === task.id
          const subtasks = task.subtasks || []
          const subtaskCount = subtasks.length
          const completedSubtasks = subtasks.filter((s) => s.completed).length
          const isExpanded = expandedTasks.has(task.id)
          const isSelected = selectedTaskIds.has(task.id)

          return (
            <SortableTaskItem key={task.id} id={task.id} isDragDisabled={selectionMode}>
              {({ dragHandleProps, isDragging }) => (
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(task.id)}>
                <div
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors hover:border-border",
                    task.completed ? "bg-muted/50" : "bg-card",
                    isExpanded && "rounded-b-none border-b-0",
                    isSelected && selectionMode && "ring-2 ring-primary/50 border-primary/50",
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary"
                  )}
                >
                  {/* Drag handle */}
                  {!selectionMode && (
                    <div
                      {...dragHandleProps}
                      className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground touch-none"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                  )}
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleTaskSelection?.(task.id)}
                      aria-label={`Select task: ${task.description}`}
                      className="mt-0.5 border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  <div className="w-18 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{startLabel}</div>

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <label className="cursor-pointer flex items-start gap-2">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) => onToggleComplete(task.id, Boolean(checked))}
                        aria-label={"Mark complete"}
                        className="border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                      />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={cn(
                            "text-sm leading-5",
                            task.completed ? "line-through text-muted-foreground" : "text-foreground",
                          )}
                          title={task.description}
                        >
                          <HighlightedText text={task.description} query={searchQuery} />
                        </div>
                        <PriorityBadge priority={task.priority} />
                        {/* Search match indicator */}
                        {searchQuery && searchQuery.trim() && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                            <Search className="h-3 w-3" />
                            Match
                          </span>
                        )}
                        {/* Recurring task indicator */}
                        {(task.recurrence || task.parentTaskId) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                                    "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                  )}
                                >
                                  <Repeat className="h-3 w-3" />
                                  {task.parentTaskId ? "Instance" : "Recurring"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {task.recurrence
                                    ? formatRecurrencePattern(task.recurrence)
                                    : "Part of a recurring task series"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {/* Multi-day task indicator */}
                        {task.endDate && currentDate && (() => {
                          const progress = getTaskProgress(task, currentDate, currentDate)
                          const position = getTaskDayPosition(task, currentDate, currentDate)
                          if (!progress) return null
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                                      "bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                                    )}
                                  >
                                    <CalendarRange className="h-3 w-3" />
                                    Day {progress.currentDay}/{progress.totalDays}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <p className="font-medium">Multi-day task</p>
                                    <p>{formatDateRange(currentDate, task.endDate)}</p>
                                    <div className="flex items-center gap-1 pt-1">
                                      <div className="flex-1 h-1.5 bg-sky-200 dark:bg-sky-900 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-sky-500 rounded-full transition-all"
                                          style={{ width: `${(progress.currentDay / progress.totalDays) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] tabular-nums">{Math.round((progress.currentDay / progress.totalDays) * 100)}%</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )
                        })()}
                        {/* Subtask count badge or add subtasks button */}
                        <CollapsibleTrigger asChild>
                          <button
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors",
                              "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ListChecks className="h-3 w-3" />
                            {subtaskCount > 0 ? (
                              <>
                                {completedSubtasks}/{subtaskCount}
                              </>
                            ) : (
                              <span>Subtasks</span>
                            )}
                            <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                          </button>
                        </CollapsibleTrigger>
                        {/* Notes indicator */}
                        {task.notes && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleNotesExpanded(task.id)
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors",
                              "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                            )}
                          >
                            <StickyNote className="h-3 w-3" />
                            Notes
                          </button>
                        )}
                        {/* Links indicator */}
                        {task.links && task.links.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleLinksExpanded(task.id)
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors",
                              "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900/50"
                            )}
                          >
                            <Link2 className="h-3 w-3" />
                            {task.links.length}
                          </button>
                        )}
                      </div>

                      {/* Tags display */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-5 border-0",
                                getTagColor(tag)
                              )}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Multi-day progress bar */}
                      {task.endDate && currentDate && (() => {
                        const progress = getTaskProgress(task, currentDate, currentDate)
                        if (!progress) return null
                        return (
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-sky-100 dark:bg-sky-900/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-500 rounded-full transition-all"
                                  style={{ width: `${(progress.currentDay / progress.totalDays) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap">
                                Day {progress.currentDay} of {progress.totalDays}
                              </span>
                            </div>
                          </div>
                        )
                      })()}

                  {/* Subline: times */}
                  {!task.completed ? (
                    <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                      <span className="tabular-nums">Start {startLabel}</span>
                      <span aria-hidden>•</span>
                      <span className="tabular-nums">Approx {approxLabel || "—"}</span>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {/* End Time display with optional inline edit */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">End</span>
                        {isEditing ? (
                          <Input
                            aria-label="Actual end time"
                            type="time"
                            step={1}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => {
                              if (editingValue) {
                                onUpdateEndTime(task.id, editingValue)
                              }
                              setEditingId(null)
                              setEditingValue("")
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (editingValue) {
                                  onUpdateEndTime(task.id, editingValue)
                                }
                                setEditingId(null)
                                setEditingValue("")
                              } else if (e.key === "Escape") {
                                setEditingId(null)
                                setEditingValue("")
                              }
                            }}
                            className="w-20 h-6 text-xs bg-background"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(task.id)
                              setEditingValue(end || "")
                            }}
                            className="flex items-center gap-1 text-xs text-foreground hover:text-foreground/80 transition-colors cursor-pointer"
                          >
                            <span className="tabular-nums">{endLabel || "—"}</span>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Completion status indicator with badge style */}
                      {completionStatus.status !== 'pending' && (() => {
                        const status = completionStatus.status as EstimationStatus
                        const delta = computeDeltaFromApprox(approx, end || "")
                        return (
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                            getStatusBgColor(status),
                            getStatusColor(status)
                          )}>
                            {completionStatus.status === 'late' && (
                              <AlertCircle className="h-3 w-3" />
                            )}
                            {completionStatus.status === 'early' && (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {completionStatus.status === 'on-time' && (
                              <Timer className="h-3 w-3" />
                            )}
                            <span>
                              {completionStatus.status === 'late' && `Late`}
                              {completionStatus.status === 'early' && `Early`}
                              {completionStatus.status === 'on-time' && 'On time'}
                            </span>
                            {delta !== 0 && (
                              <span className="font-mono">{formatDeltaTime(delta)}</span>
                            )}
                          </div>
                        )
                      })()}

                      {/* Total duration */}
                      {diffLabel && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Total {diffLabel}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>

              {/* Notes section */}
              {(task.notes || notesExpanded.has(task.id)) && (
                <div className="mt-2 ml-6">
                  {editingNotesId === task.id ? (
                    <div className="flex flex-col gap-1.5">
                      <Textarea
                        placeholder="Add notes for this task..."
                        value={editingNotesValue}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_NOTES_LENGTH) {
                            setEditingNotesValue(e.target.value)
                          }
                        }}
                        className="min-h-[80px] text-sm bg-background resize-none"
                        maxLength={MAX_NOTES_LENGTH}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {editingNotesValue.length}/{MAX_NOTES_LENGTH}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingNotesId(null)
                              setEditingNotesValue("")
                            }}
                            className="h-7 text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onUpdateNotes(task.id, editingNotesValue.trim() || null)
                              setEditingNotesId(null)
                              setEditingNotesValue("")
                            }}
                            className="h-7 text-xs cursor-pointer"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingNotesId(task.id)
                        setEditingNotesValue(task.notes || "")
                      }}
                      className="p-2 rounded-lg bg-muted/50 border border-muted cursor-pointer hover:bg-muted/70 transition-colors"
                    >
                      {task.notes ? (
                        <div className="text-sm text-foreground whitespace-pre-wrap">
                          {renderMarkdown(task.notes)}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground italic">
                          Click to add notes...
                        </div>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Pencil className="h-3 w-3" />
                        Click to edit
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Links section */}
              {linksExpanded.has(task.id) && task.links && task.links.length > 0 && (
                <div className="mt-2 ml-6 space-y-1.5">
                  {task.links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-muted hover:bg-muted/70 transition-colors group/link"
                    >
                      <Link2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {link.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {link.url}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {onStartPomodoro && !task.completed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStartPomodoro(task.id, task.description)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-red-500 cursor-pointer"
                        >
                          <Timer className="h-4 w-4" />
                          <span className="sr-only">Start Pomodoro for task</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Start Pomodoro timer</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onFocus && !task.completed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFocus(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-emerald-600 cursor-pointer"
                    >
                      <Target className="h-4 w-4" />
                      <span className="sr-only">Focus on task</span>
                    </Button>
                  )}
                  {onSaveAsTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSaveAsTemplate(task)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      <BookmarkPlus className="h-4 w-4" />
                      <span className="sr-only">Save as template</span>
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDuplicate(task)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Duplicate task</span>
                    </Button>
                  )}
                  {currentDate && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <TaskExportButton task={task} date={currentDate} />
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete task</span>
                  </Button>
                </div>
              </div>

              {/* Collapsible subtask section */}
              <CollapsibleContent>
                <div className={cn(
                  "border border-t-0 rounded-b-xl p-3 pt-2",
                  task.completed ? "bg-muted/50" : "bg-card"
                )}>
                  <SubtaskList
                    subtasks={subtasks}
                    onToggleSubtask={(subtaskId, completed) => onToggleSubtask(task.id, subtaskId, completed)}
                    onAddSubtask={(description) => onAddSubtask(task.id, description)}
                    onDeleteSubtask={(subtaskId) => onDeleteSubtask(task.id, subtaskId)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
              )}
            </SortableTaskItem>
          )
        })}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
