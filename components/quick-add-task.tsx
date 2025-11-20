"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseTaskInput, getAutocompleteSuggestions, formatTimeDisplay } from "@/lib/task-parser"
import type { ParsedTask } from "@/lib/task-parser"
import { Command, Clock, Tag, AlertTriangle, Calendar, Sparkles, CornerDownLeft } from "lucide-react"

type QuickAddTaskProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateTask: (task: {
    startTime: string
    approxEndTime: string
    description: string
    priority?: "high" | "medium" | "low" | null
    tags?: string[]
  }) => void
  selectedDate: Date
}

export default function QuickAddTask({
  open,
  onOpenChange,
  onCreateTask,
  selectedDate,
}: QuickAddTaskProps) {
  const [input, setInput] = useState("")
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse input whenever it changes
  useEffect(() => {
    if (input.trim()) {
      const parsed = parseTaskInput(input)
      setParsedTask(parsed)
      setSuggestions(getAutocompleteSuggestions(input))
    } else {
      setParsedTask(null)
      setSuggestions([])
    }
    setSelectedSuggestionIndex(-1)
  }, [input])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    } else {
      setInput("")
      setParsedTask(null)
      setSuggestions([])
    }
  }, [open])

  const handleSubmit = useCallback(() => {
    if (!parsedTask || !parsedTask.description.trim()) return

    // Default times if not specified
    const startTime = parsedTask.startTime || "09:00"
    const endTime = parsedTask.endTime || "10:00"

    onCreateTask({
      startTime,
      approxEndTime: endTime,
      description: parsedTask.description,
      priority: parsedTask.priority,
      tags: parsedTask.tags.length > 0 ? parsedTask.tags : undefined,
    })

    onOpenChange(false)
  }, [parsedTask, onCreateTask, onOpenChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        // Apply suggestion
        const suggestion = suggestions[selectedSuggestionIndex]
        setInput((prev) => prev + " " + suggestion + " ")
        setSelectedSuggestionIndex(-1)
      } else {
        handleSubmit()
      }
    } else if (e.key === "Escape") {
      onOpenChange(false)
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault()
      setSelectedSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      )
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault()
      const suggestion = suggestions[selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0]
      setInput((prev) => prev + " " + suggestion + " ")
      setSelectedSuggestionIndex(-1)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const getPriorityColor = (priority: string | null) => {
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
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Quick Add Task</DialogTitle>
          <DialogDescription>
            Add a task using natural language
          </DialogDescription>
        </DialogHeader>

        {/* Input area */}
        <div className="border-b">
          <div className="flex items-center gap-3 px-4 py-3">
            <Sparkles className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Try: "Meeting at 2pm for 1 hour #work !high"'
              className="border-0 shadow-none focus-visible:ring-0 text-base p-0 h-auto"
            />
          </div>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="border-b px-4 py-2">
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput((prev) => prev + " " + suggestion + " ")
                  }}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    index === selectedSuggestionIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {parsedTask && parsedTask.description && (
          <div className="p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Preview
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-3">
              {/* Task description */}
              <div className="font-medium text-foreground">
                {parsedTask.description || "No description"}
              </div>

              {/* Details row */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {/* Date */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(selectedDate)}</span>
                </div>

                {/* Time */}
                {parsedTask.startTime && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {formatTimeDisplay(parsedTask.startTime)}
                      {parsedTask.endTime && ` - ${formatTimeDisplay(parsedTask.endTime)}`}
                    </span>
                  </div>
                )}

                {/* Duration */}
                {parsedTask.duration && (
                  <div className="text-xs">
                    ({parsedTask.duration} min)
                  </div>
                )}
              </div>

              {/* Tags and Priority */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Priority */}
                {parsedTask.priority && (
                  <Badge variant="secondary" className={getPriorityColor(parsedTask.priority)}>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {parsedTask.priority}
                  </Badge>
                )}

                {/* Tags */}
                {parsedTask.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Help text when empty */}
        {!input && (
          <div className="p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Add Syntax
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">at 2pm</code>
                <span>Set start time</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">9:00-10:00</code>
                <span>Set time range</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">for 30min</code>
                <span>Set duration</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">#work</code>
                <span>Add tag</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">!high</code>
                <span>Set priority</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
              <span>close</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd>
              <span>autocomplete</span>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!parsedTask?.description?.trim()}
            size="sm"
            className="gap-1.5"
          >
            <span>Create task</span>
            <CornerDownLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Button component for header
export function QuickAddButton({ onClick }: { onClick: () => void }) {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0)
  }, [])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <Command className="h-4 w-4" />
      <span className="hidden sm:inline">Quick Add</span>
      <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-mono text-muted-foreground">
        {isMac ? "Cmd" : "Ctrl"}+K
      </kbd>
    </Button>
  )
}
