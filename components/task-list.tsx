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
  const [editingValue, setEditingValue] = useState<string>("")

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-card">
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
              "group flex items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors hover:border-border",
              task.completed ? "bg-muted/50" : "bg-card",
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
                  className="border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm leading-5",
                      task.completed ? "line-through text-muted-foreground" : "text-foreground",
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
                            className="flex items-center gap-1 text-xs text-foreground hover:text-foreground/80 transition-colors"
                          >
                            <span className="tabular-nums">{endLabel || "—"}</span>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Delta indicator */}
                      {deltaSeconds !== undefined && (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              deltaSeconds > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400",
                            )}
                          >
                            {deltaSeconds > 0 ? "▲" : "▼"} {deltaHuman}
                          </span>
                        </div>
                      )}

                      {/* Total duration */}
                      {diffLabel && (
                        <div className="text-xs text-muted-foreground">
                          Total {diffLabel}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete task</span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
