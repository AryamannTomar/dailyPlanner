"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Clock, FileText, ChevronDown, ChevronUp, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { TaskTemplate } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function formatTime12h(time24: string): string {
  if (!time24) return ""
  const [hStr = "00", mStr = "00"] = time24.split(":")
  let h = Number.parseInt(hStr, 10)
  const m = mStr.padStart(2, "0")
  const period = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${period}`
}

export default function TemplateManager({
  templates = [],
  onDelete,
}: {
  templates?: TaskTemplate[]
  onDelete: (templateId: string) => void
}) {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-card">
        No templates saved yet. Save a task as a template to reuse it later.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {templates.map((template) => {
        const isExpanded = expandedTemplates.has(template.id)
        const task = template.task

        return (
          <li key={template.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(template.id)}>
              <div
                className={cn(
                  "group flex items-start gap-3 rounded-xl border p-3 shadow-sm transition-colors hover:border-border bg-card",
                  isExpanded && "rounded-b-none border-b-0"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {template.name}
                    </span>
                    <CollapsibleTrigger asChild>
                      <button
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors bg-muted text-muted-foreground hover:bg-muted/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Details
                        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {task.description}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(template.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete template</span>
                </Button>
              </div>

              <CollapsibleContent>
                <div className="border border-t-0 rounded-b-xl p-3 pt-2 bg-card space-y-2">
                  {/* Time info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime12h(task.startTime)} - {formatTime12h(task.approxEndTime)}</span>
                  </div>

                  {/* Priority */}
                  {task.priority && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Priority:</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          task.priority === "high" && "border-red-500 text-red-500",
                          task.priority === "medium" && "border-yellow-500 text-yellow-500",
                          task.priority === "low" && "border-blue-500 text-blue-500"
                        )}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-3 w-3 text-muted-foreground" />
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

                  {/* Notes preview */}
                  {task.notes && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Notes:</span> {task.notes.slice(0, 100)}
                      {task.notes.length > 100 && "..."}
                    </div>
                  )}

                  {/* Subtasks count */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Subtasks:</span> {task.subtasks.length} items
                    </div>
                  )}

                  {/* Links count */}
                  {task.links && task.links.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Links:</span> {task.links.length} attached
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </li>
        )
      })}
    </ul>
  )
}
