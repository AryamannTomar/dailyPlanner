"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ProgressCircle from "@/components/progress-circle"
import TaskList from "@/components/task-list"
import AddTaskForm from "@/components/add-task-form"
import BulkActionsBar from "@/components/bulk-actions-bar"
import type { CategoryKey, CategoryState, Task, HabitDefinition, HabitEntry, CategoriesByDate } from "@/lib/types"
import { isHabitCompleted, getHabitCompletionPercent } from "@/lib/types"
import { getDayLabel, toShortLabelDate } from "@/lib/date-utils"
import { ChevronDown, Plus, Minus, Star, Flame, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { IconLookup } from "@/components/habit-manager"
import { wouldContinueStreak, getPotentialStreak, getStreakColor } from "@/lib/streak-utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getHabitMiniStats } from "@/lib/habit-stats"

type AddableTask = {
  startTime: string
  approxEndTime: string
  description: string
}

export default function DayCard({
  date,
  dateISO,
  tasks,
  categories,
  habits,
  isToday = false,
  categoriesByDate,
  onToggleComplete,
  onAddTask,
  onToggleCategory,
  onIncrementHabit,
  onDecrementHabit,
  onUpdateEndTime,
  onDeleteTask,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
  onDuplicate,
  onBulkDelete,
  onBulkComplete,
  onBulkMove,
  onBulkDuplicate,
  onFocusTask,
  onStartPomodoro,
  onReorder,
  searchQuery,
}: {
  date: Date
  dateISO: string
  tasks: Task[]
  categories: CategoryState
  habits: HabitDefinition[]
  isToday?: boolean
  categoriesByDate?: CategoriesByDate
  onToggleComplete: (taskId: string, completed: boolean) => void
  onAddTask: (task: AddableTask) => void
  onToggleCategory: (key: CategoryKey, value: boolean) => void
  onIncrementHabit: (key: CategoryKey) => void
  onDecrementHabit: (key: CategoryKey) => void
  onUpdateEndTime: (taskId: string, newEndTime: string) => void
  onDeleteTask: (taskId: string) => void
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void
  onAddSubtask: (taskId: string, description: string) => void
  onDeleteSubtask: (taskId: string, subtaskId: string) => void
  onDuplicate?: (task: Task) => void
  onBulkDelete?: (taskIds: string[]) => void
  onBulkComplete?: (taskIds: string[]) => void
  onBulkMove?: (taskIds: string[], targetDate: string) => void
  onBulkDuplicate?: (taskIds: string[]) => void
  onFocusTask?: (taskId: string) => void
  onStartPomodoro?: (taskId: string, taskDescription: string) => void
  onReorder?: (taskIds: string[]) => void
  searchQuery?: string
}) {
  const [open, setOpen] = useState<boolean>(false)
  const [showAdd, setShowAdd] = useState<boolean>(false)
  const [selectionMode, setSelectionMode] = useState<boolean>(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)

  const { percent, summary } = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.completed).length
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { percent: pct, summary: `${completed}/${total} completed` }
  }, [tasks])

  const measure = () => {
    const el = contentRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const next = el.scrollHeight
      setContentHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev))
    })
  }

  useLayoutEffect(() => {
    if (open) {
      // Small delay to ensure DOM is updated
      setTimeout(measure, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) {
      // Measure after tasks change or add form toggle
      setTimeout(measure, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, showAdd, tasks])

  useEffect(() => {
    const onResize = () => {
      if (open) {
        setTimeout(measure, 0)
      }
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Measure when task content changes (like editing end times)
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(measure, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [open, tasks])

  // Selection handlers
  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedTaskIds(new Set(tasks.map((t) => t.id)))
    } else {
      setSelectedTaskIds(new Set())
    }
  }

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set())
    setSelectionMode(false)
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedTaskIds.size > 0) {
      onBulkDelete(Array.from(selectedTaskIds))
      handleClearSelection()
    }
  }

  const handleBulkComplete = () => {
    if (onBulkComplete && selectedTaskIds.size > 0) {
      onBulkComplete(Array.from(selectedTaskIds))
      handleClearSelection()
    }
  }

  const handleBulkMove = (targetDate: string) => {
    if (onBulkMove && selectedTaskIds.size > 0) {
      onBulkMove(Array.from(selectedTaskIds), targetDate)
      handleClearSelection()
    }
  }

  const handleBulkDuplicate = () => {
    if (onBulkDuplicate && selectedTaskIds.size > 0) {
      onBulkDuplicate(Array.from(selectedTaskIds))
      handleClearSelection()
    }
  }

    const CategoryPill = ({
    label,
    colorChecked,
    value,
    onChange,
  }: {
    label: string
    colorChecked: string
    value: boolean
    onChange: (v: boolean) => void
  }) => {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] select-none cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onChange(!value)
        }}
      >
        <Checkbox
          checked={value}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
          className={cn(
            "h-3.5 w-3.5 border-border data-[state=checked]:text-white",
            "data-[state=checked]:border-transparent",
          )}
          style={value ? { backgroundColor: colorChecked } : {}}
          aria-label={label}
        />
        <span className="text-[11px] text-foreground font-medium">{label}</span>
      </div>
    )
  }

  return (
    <div className={cn("min-w-[300px] max-w-[360px] flex-1")}>
      <Card
        className={cn(
          "transition-shadow duration-300 rounded-2xl border hover:shadow-md",
          open ? "shadow-lg" : "shadow-sm",
          isToday ? "border-emerald-200 dark:border-emerald-700" : "border-border",
        )}
      >
        <div
          role="button"
          tabIndex={0}
          className="w-full flex flex-col gap-3 p-4 text-left"
          aria-expanded={open}
          aria-controls={`${dateISO}-content`}
        >
          <div 
            className="w-full flex items-center gap-3 cursor-pointer"
            onClick={() => setOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                setOpen((v) => !v)
              }
            }}
            tabIndex={0}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-semibold",
                isToday 
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" 
                  : "bg-muted text-muted-foreground",
              )}
            >
              {getDayLabel(date).slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">
                {getDayLabel(date)}{" "}
                <span className="text-muted-foreground">
                  {" • "}
                  {toShortLabelDate(date)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{summary}</div>
            </div>
            <div className="flex items-center gap-3">
              <ProgressCircle percent={percent} size={40} strokeWidth={6} />
              <ChevronDown
                className={cn("h-5 w-5 transition-transform duration-300 text-muted-foreground", open ? "rotate-180" : "rotate-0")}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {habits.map((habit) => {
              const entry = categories[habit.id]
              const IconComponent = IconLookup[habit.icon] || Star

              // Handle goal-based habits
              if (habit.goal && habit.goal > 0) {
                // Get or create the goal entry
                const goalEntry = typeof entry === 'object' && entry !== null && 'value' in entry && 'goal' in entry
                  ? entry
                  : { value: 0, goal: habit.goal }

                const percent = getHabitCompletionPercent(goalEntry)
                const isComplete = goalEntry.value >= goalEntry.goal

                // Streak info
                const hasStreak = categoriesByDate && isToday && wouldContinueStreak(habit.id, categoriesByDate)
                const potentialStreak = categoriesByDate && isToday ? getPotentialStreak(habit.id, categoriesByDate) : 0

                return (
                  <div
                    key={habit.id}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] select-none transition-colors",
                      isComplete ? "bg-opacity-20" : ""
                    )}
                    style={{
                      borderColor: isComplete ? habit.color : undefined,
                      backgroundColor: isComplete ? `${habit.color}15` : undefined,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDecrementHabit(habit.id)
                      }}
                      aria-label={`Decrease ${habit.name}`}
                    >
                      <Minus className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>

                    <div className="flex items-center gap-1 px-0.5">
                      <div className="relative h-3.5 w-3.5">
                        {/* Progress ring */}
                        <svg className="h-3.5 w-3.5 -rotate-90" viewBox="0 0 16 16">
                          <circle
                            cx="8"
                            cy="8"
                            r="6"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-muted/30"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="6"
                            fill="none"
                            stroke={habit.color}
                            strokeWidth="2"
                            strokeDasharray={`${(percent / 100) * 37.7} 37.7`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] font-medium tabular-nums" style={{ color: isComplete ? habit.color : undefined }}>
                        {goalEntry.value}/{goalEntry.goal}
                      </span>
                      <IconComponent className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-foreground font-medium">{habit.name}</span>
                      {hasStreak && potentialStreak > 1 && (
                        <div className="flex items-center gap-0.5 ml-0.5">
                          <Flame className={cn("h-3 w-3 animate-flicker", getStreakColor(potentialStreak))} />
                          <span className={cn("text-[9px] font-bold", getStreakColor(potentialStreak))}>
                            {potentialStreak}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onIncrementHabit(habit.id)
                      }}
                      aria-label={`Increase ${habit.name}`}
                    >
                      <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                )
              }

              // Handle boolean habits
              const isCompleted = entry ? isHabitCompleted(entry) : false

              // Get mini stats for tooltip
              const miniStats = categoriesByDate ? getHabitMiniStats(habit.id, categoriesByDate) : null

              // Streak info for boolean habits
              const hasStreak = categoriesByDate && isToday && wouldContinueStreak(habit.id, categoriesByDate)
              const potentialStreak = categoriesByDate && isToday ? getPotentialStreak(habit.id, categoriesByDate) : 0

              return (
                <Tooltip key={habit.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] select-none cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCategory(habit.id, !isCompleted)
                      }}
                    >
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={(checked) => onToggleCategory(habit.id, Boolean(checked))}
                        className={cn(
                          "h-3.5 w-3.5 border-border data-[state=checked]:text-white",
                          "data-[state=checked]:border-transparent",
                        )}
                        style={isCompleted ? { backgroundColor: habit.color } : {}}
                        aria-label={habit.name}
                      />
                      <IconComponent className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-foreground font-medium">{habit.name}</span>
                      {miniStats && (
                        <span className="text-[9px] text-muted-foreground ml-0.5">
                          {miniStats.weeklyCompleted}/{miniStats.weeklyTotal}
                        </span>
                      )}
                      {hasStreak && potentialStreak > 1 && (
                        <div className="flex items-center gap-0.5 ml-0.5">
                          <Flame className={cn("h-3 w-3 animate-flicker", getStreakColor(potentialStreak))} />
                          <span className={cn("text-[9px] font-bold", getStreakColor(potentialStreak))}>
                            {potentialStreak}
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  {miniStats && (
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-1">
                        <div className="font-medium">{habit.name}</div>
                        <div>This week: {miniStats.weeklyCompleted}/{miniStats.weeklyTotal}</div>
                        <div>Monthly rate: {miniStats.monthlyRate}%</div>
                        {miniStats.currentStreak > 0 && (
                          <div>Current streak: {miniStats.currentStreak} days</div>
                        )}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              )
            })}
          </div>
        </div>

        <div
          id={`${dateISO}-content`}
          aria-hidden={!open}
          className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
          style={{
            maxHeight: open ? `${contentHeight + 20}px` : 0, // Add some padding for better spacing
            opacity: open ? 1 : 0,
            contain: "layout paint style",
            willChange: "max-height",
          }}
        >
          <div ref={contentRef}>
            <div className="px-4 pb-4">
              {/* Action buttons at the top */}
              <div className="mb-3 flex gap-2">
                {showAdd ? (
                  <AddTaskForm
                    onCancel={() => setShowAdd(false)}
                    onSave={(t) => {
                      onAddTask(t)
                      setShowAdd(false)
                      setTimeout(() => measure(), 0)
                    }}
                    currentDate={dateISO}
                  />
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 justify-center gap-2 bg-transparent cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAdd(true)
                        setTimeout(() => measure(), 0)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {"Add Task"}
                    </Button>
                    {tasks.length > 0 && (
                      <Button
                        variant={selectionMode ? "secondary" : "outline"}
                        size="sm"
                        className="justify-center gap-2 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (selectionMode) {
                            handleClearSelection()
                          } else {
                            setSelectionMode(true)
                          }
                          setTimeout(() => measure(), 0)
                        }}
                      >
                        <CheckSquare className="h-4 w-4" />
                        {selectionMode ? "Cancel" : "Select"}
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Bulk actions bar */}
              {selectionMode && selectedTaskIds.size > 0 && (
                <BulkActionsBar
                  selectedCount={selectedTaskIds.size}
                  onDelete={handleBulkDelete}
                  onComplete={handleBulkComplete}
                  onMove={handleBulkMove}
                  onDuplicate={handleBulkDuplicate}
                  onClearSelection={handleClearSelection}
                />
              )}

              {/* Task list below */}
              <TaskList
                tasks={tasks}
                onToggleComplete={(id, completed) => onToggleComplete(id, completed)}
                onUpdateEndTime={(id, newTime) => onUpdateEndTime(id, newTime)}
                onDelete={(id) => onDeleteTask(id)}
                onToggleSubtask={(taskId, subtaskId, completed) => onToggleSubtask(taskId, subtaskId, completed)}
                onAddSubtask={(taskId, description) => onAddSubtask(taskId, description)}
                onDeleteSubtask={(taskId, subtaskId) => onDeleteSubtask(taskId, subtaskId)}
                onUpdateNotes={() => {}}
                onDuplicate={onDuplicate}
                onReorder={onReorder}
                selectionMode={selectionMode}
                selectedTaskIds={selectedTaskIds}
                onToggleTaskSelection={handleToggleTaskSelection}
                onSelectAll={handleSelectAll}
                onFocus={onFocusTask}
                onStartPomodoro={onStartPomodoro}
                searchQuery={searchQuery}
                currentDate={dateISO}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}