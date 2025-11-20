"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings2,
  RotateCcw,
  Eye,
  EyeOff,
  GripVertical,
  CheckSquare,
  Flame,
  TrendingUp,
  Timer,
  Target,
  Calendar,
  StickyNote,
  Save,
} from "lucide-react"
import {
  type DashboardLayout,
  type DashboardWidget,
  type WidgetType,
  type WidgetSize,
  WIDGET_METADATA,
  DEFAULT_DASHBOARD_LAYOUT,
  updateWidgetSize,
  toggleWidgetVisibility,
} from "@/lib/dashboard-utils"

interface DashboardCustomizerProps {
  layout: DashboardLayout
  onLayoutChange: (layout: DashboardLayout) => void
  onReset: () => void
}

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  TasksToday: <CheckSquare className="h-4 w-4" />,
  HabitStreak: <Flame className="h-4 w-4" />,
  WeekProgress: <TrendingUp className="h-4 w-4" />,
  Pomodoro: <Timer className="h-4 w-4" />,
  Goals: <Target className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  Notes: <StickyNote className="h-4 w-4" />,
}

export function DashboardCustomizer({
  layout,
  onLayoutChange,
  onReset,
}: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false)
  const [localLayout, setLocalLayout] = useState<DashboardLayout>(layout)
  const [previewMode, setPreviewMode] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setLocalLayout(layout)
    }
    setOpen(isOpen)
  }

  const handleToggleVisibility = (widgetId: string) => {
    setLocalLayout(prev => toggleWidgetVisibility(prev, widgetId))
  }

  const handleSizeChange = (widgetId: string, size: WidgetSize) => {
    setLocalLayout(prev => updateWidgetSize(prev, widgetId, size))
  }

  const handleSave = () => {
    onLayoutChange(localLayout)
    setOpen(false)
  }

  const handleReset = () => {
    const defaultLayout = { ...DEFAULT_DASHBOARD_LAYOUT }
    setLocalLayout(defaultLayout)
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetWidgetId) return

    setLocalLayout(prev => {
      const widgets = [...prev.widgets]
      const draggedIndex = widgets.findIndex(w => w.id === draggedWidget)
      const targetIndex = widgets.findIndex(w => w.id === targetWidgetId)

      if (draggedIndex === -1 || targetIndex === -1) return prev

      // Swap positions
      const draggedPos = widgets[draggedIndex].position
      const targetPos = widgets[targetIndex].position

      widgets[draggedIndex] = { ...widgets[draggedIndex], position: targetPos }
      widgets[targetIndex] = { ...widgets[targetIndex], position: draggedPos }

      return { ...prev, widgets }
    })

    setDraggedWidget(null)
  }

  const handleDragEnd = () => {
    setDraggedWidget(null)
  }

  // Sort widgets by position for display
  const sortedWidgets = [...localLayout.widgets].sort((a, b) => {
    if (a.position.y !== b.position.y) return a.position.y - b.position.y
    return a.position.x - b.position.x
  })

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Customize Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="preview-mode" className="text-sm font-medium">
              Preview Mode
            </Label>
            <Switch
              id="preview-mode"
              checked={previewMode}
              onCheckedChange={setPreviewMode}
            />
          </div>

          {previewMode ? (
            /* Preview Grid */
            <Card className="border-dashed">
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-2 min-h-[300px]">
                  {sortedWidgets.filter(w => w.visible).map(widget => {
                    const meta = WIDGET_METADATA[widget.type]
                    return (
                      <div
                        key={widget.id}
                        className={cn(
                          "border rounded-lg p-3 bg-muted/30 flex flex-col items-center justify-center text-center",
                          widget.size === 'small' && "col-span-1 row-span-1",
                          widget.size === 'medium' && "col-span-2 row-span-1",
                          widget.size === 'large' && "col-span-2 row-span-2"
                        )}
                      >
                        <div className="text-muted-foreground mb-1">
                          {WIDGET_ICONS[widget.type]}
                        </div>
                        <span className="text-xs font-medium">{meta.name}</span>
                        <span className="text-[10px] text-muted-foreground">{widget.size}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Widget List */
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {sortedWidgets.map(widget => {
                  const meta = WIDGET_METADATA[widget.type]
                  return (
                    <Card
                      key={widget.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, widget.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, widget.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "transition-all cursor-grab active:cursor-grabbing",
                        !widget.visible && "opacity-50",
                        draggedWidget === widget.id && "opacity-30"
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Drag Handle */}
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                          {/* Icon */}
                          <div className="text-muted-foreground shrink-0">
                            {WIDGET_ICONS[widget.type]}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{meta.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {meta.description}
                            </div>
                          </div>

                          {/* Size Selector */}
                          <Select
                            value={widget.size}
                            onValueChange={(value) => handleSizeChange(widget.id, value as WidgetSize)}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="large">Large</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Visibility Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisibility(widget.id)}
                            className="h-8 w-8 p-0 shrink-0"
                          >
                            {widget.visible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Default
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Layout
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
