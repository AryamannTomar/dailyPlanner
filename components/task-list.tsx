"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { computeDeltaFromApprox, formatDurationHuman, formatTime12h } from "@/lib/time-utils"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TaskList({
  tasks = [],
  onToggleComplete,
  onUpdateEndTime,
  onDelete,
}: {
  tasks?: Task[]
  onToggleComplete: (taskId: string, completed: boolean) => void
  onUpdateEndTime: (taskId: string, newEndTime: string) => void
  onDelete: (taskId: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border rounded-lg p-3">
        {"No tasks yet. Add your first task for this day."}
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const start = (task as any).startTime ?? (task as any).time ?? ""
        const approx = (task as any).approxEndTime ?? ""
        const end = task.actualEndTime
        const diffLabel = typeof task.durationSeconds === "number" ? formatDurationHuman(task.durationSeconds) : ""
        const startLabel = formatTime12h(start)
        const approxLabel = formatTime12h(approx)
        const endLabel = end ? formatTime12h(end) : ""
        const deltaSeconds = end ? computeDeltaFromApprox(approx, end) : undefined
        const deltaHuman = typeof deltaSeconds === "number" ? formatDurationHuman(Math.abs(deltaSeconds)) : ""

        const isEditing = editingId === task.id

        return (
          <li
            key={task.id}
            className={cn(
              "group flex items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors hover:border-neutral-300",
              task.completed ? "bg-neutral-50" : "bg-white",
            )}
          >
            <div className="w-18 shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{startLabel}</div>

            <div className="flex-1 min-w-0">
              {/* Title row */}
              <label className="cursor-pointer flex items-start gap-2">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onToggleComplete(task.id, Boolean(checked))}
                  aria-label={"Mark complete"}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm leading-5",
                      task.completed ? "line-through text-neutral-500" : "text-neutral-900",
                    )}
                    title={task.description}
                  >
                    {task.description}
                  </div>

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
                            value={end || ""}
                            onChange={(e) => onUpdateEndTime(task.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            className="h-7 w-[120px] text-xs"
                            autoFocus
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(task.id)}
                            className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-300"
                            aria-label="Edit end time"
                          >
                            <span className="tabular-nums text-xs text-neutral-800">{endLabel || "—"}</span>
                            <Pencil className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-500" />
                          </button>
                        )}
                      </div>

                      {/* Delta vs approx */}
                      {end && (
                        <span className="text-xs text-muted-foreground">
                          Δ{" "}
                          <span
                            className={cn(deltaSeconds! >= 0 ? "text-amber-600" : "text-emerald-600", "font-medium")}
                          >
                            {deltaSeconds! === 0 ? "on time" : `${deltaSeconds! > 0 ? "+" : "-"}${deltaHuman}`}
                          </span>
                        </span>
                      )}

                      {/* Total duration aligned to the end */}
                      {typeof task.durationSeconds === "number" && (
                        <span className="ml-auto text-xs text-muted-foreground">Total {diffLabel}</span>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="shrink-0 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-neutral-500 hover:text-red-600"
                aria-label="Delete task"
                title="Delete task"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
