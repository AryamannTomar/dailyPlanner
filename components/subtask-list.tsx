"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Subtask } from "@/lib/types"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SubtaskList({
  subtasks = [],
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}: {
  subtasks?: Subtask[]
  onToggleSubtask: (subtaskId: string, completed: boolean) => void
  onAddSubtask: (description: string) => void
  onDeleteSubtask: (subtaskId: string) => void
}) {
  const [newSubtask, setNewSubtask] = useState("")

  const completedCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      onAddSubtask(newSubtask.trim())
      setNewSubtask("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  return (
    <div className="space-y-2">
      {/* Completion count */}
      {totalCount > 0 && (
        <div className="text-xs text-muted-foreground font-medium">
          {completedCount}/{totalCount} done
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 && (
        <ul className="space-y-1">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={(checked) => onToggleSubtask(subtask.id, Boolean(checked))}
                aria-label={`Mark subtask "${subtask.description}" as ${subtask.completed ? "incomplete" : "complete"}`}
                className="h-3.5 w-3.5 border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
              />
              <span
                className={cn(
                  "flex-1 text-xs",
                  subtask.completed ? "line-through text-muted-foreground" : "text-foreground"
                )}
              >
                {subtask.description}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteSubtask(subtask.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete subtask</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new subtask */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a subtask..."
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs flex-1 bg-background"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSubtask}
          disabled={!newSubtask.trim()}
          className="h-7 px-2 cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span className="sr-only">Add subtask</span>
        </Button>
      </div>
    </div>
  )
}
