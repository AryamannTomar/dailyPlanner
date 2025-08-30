"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import ProgressCircle from "@/components/progress-circle"
import TaskList from "@/components/task-list"
import AddTaskForm from "@/components/add-task-form"
import type { CategoryKey, CategoryState, Task } from "@/lib/types"
import { getDayLabel, toShortLabelDate } from "@/lib/date-utils"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

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
  isToday = false,
  onToggleComplete,
  onAddTask,
  onToggleCategory,
  onUpdateEndTime,
  onDeleteTask,
}: {
  date: Date
  dateISO: string
  tasks: Task[]
  categories: CategoryState
  isToday?: boolean
  onToggleComplete: (taskId: string, completed: boolean) => void
  onAddTask: (task: AddableTask) => void
  onToggleCategory: (key: CategoryKey, value: boolean) => void
  onUpdateEndTime: (taskId: string, newEndTime: string) => void
  onDeleteTask: (taskId: string) => void
}) {
  const [open, setOpen] = useState<boolean>(false)
  const [showAdd, setShowAdd] = useState<boolean>(false)

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
    if (open) measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, showAdd])

  useEffect(() => {
    const onResize = () => {
      if (open) measure()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

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
        onClick={(e) => e.stopPropagation()}
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
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              setOpen((v) => !v)
            }
          }}
          className="w-full flex flex-col gap-3 p-4 text-left"
          aria-expanded={open}
          aria-controls={`${dateISO}-content`}
        >
          <div className="w-full flex items-center gap-3">
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
            <CategoryPill
              label="Water"
              colorChecked="rgb(14, 165, 233)"
              value={categories.water}
              onChange={(v) => onToggleCategory("water", v)}
            />
            <CategoryPill
              label="Meat"
              colorChecked="rgb(236, 72, 153)"
              value={categories.meat}
              onChange={(v) => onToggleCategory("meat", v)}
            />
            <CategoryPill
              label="Sleep"
              colorChecked="rgb(167, 139, 250)"
              value={categories.sleep}
              onChange={(v) => onToggleCategory("sleep", v)}
            />
            <CategoryPill
              label="Gym"
              colorChecked="rgb(249, 115, 22)"
              value={categories.gym}
              onChange={(v) => onToggleCategory("gym", v)}
            />
          </div>
        </div>

        <div
          id={`${dateISO}-content`}
          aria-hidden={!open}
          className="transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden"
          style={{
            maxHeight: open ? contentHeight : 0,
            opacity: open ? 1 : 0,
            contain: "layout paint style",
            willChange: "max-height",
          }}
        >
          <div ref={contentRef}>
            <div className="px-4 pb-4">
              {/* Add Task button at the top */}
              <div className="mb-3">
                {showAdd ? (
                  <AddTaskForm
                    onCancel={() => setShowAdd(false)}
                    onSave={(t) => {
                      onAddTask(t)
                      setShowAdd(false)
                      setTimeout(() => measure(), 0)
                    }}
                  />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center gap-2 bg-transparent"
                    onClick={() => {
                      setShowAdd(true)
                      setTimeout(() => measure(), 0)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {"Add Task"}
                  </Button>
                )}
              </div>

              {/* Task list below */}
              <TaskList
                tasks={tasks}
                onToggleComplete={(id, completed) => onToggleComplete(id, completed)}
                onUpdateEndTime={(id, newTime) => onUpdateEndTime(id, newTime)}
                onDelete={(id) => onDeleteTask(id)}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
