"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  StickyNote,
  Minus,
  Maximize2,
  Save,
} from "lucide-react"
import { saveQuickNotes, loadQuickNotes } from "@/lib/dashboard-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface NotesWidgetProps {
  size: WidgetSize
  minimized: boolean
  onMinimize: () => void
}

export function NotesWidget({
  size,
  minimized,
  onMinimize,
}: NotesWidgetProps) {
  const [notes, setNotes] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    setNotes(loadQuickNotes())
  }, [])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    saveQuickNotes(notes)
    setHasUnsavedChanges(false)
  }

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const timer = setTimeout(() => {
      saveQuickNotes(notes)
      setHasUnsavedChanges(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [notes, hasUnsavedChanges])

  const previewText = notes.trim().split('\n')[0] || 'No notes'

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate max-w-[100px]">
              {previewText}
            </span>
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
            <StickyNote className="h-4 w-4 text-yellow-500" />
            Quick Notes
            {hasUnsavedChanges && (
              <span className="text-[10px] text-muted-foreground">(unsaved)</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-6 w-6 p-0"
              disabled={!hasUnsavedChanges}
            >
              <Save className={cn("h-3 w-3", hasUnsavedChanges && "text-yellow-500")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3">
        <Textarea
          placeholder="Jot down quick notes..."
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className={cn(
            "resize-none h-full min-h-[100px] text-sm",
            size === 'small' && "min-h-[60px]",
            size === 'large' && "min-h-[200px]"
          )}
        />
      </CardContent>
    </Card>
  )
}
