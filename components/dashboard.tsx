"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  type DashboardLayout,
  type DashboardWidget,
  loadDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
  toggleWidgetMinimized,
  getVisibleWidgets,
  WIDGET_SIZE_CONFIG,
} from "@/lib/dashboard-utils"
import { DashboardCustomizer } from "@/components/dashboard-customizer"
import {
  QuickTasksWidget,
  HabitStreakWidget,
  WeekProgressWidget,
  PomodoroWidget,
  GoalsWidget,
  CalendarWidget,
  NotesWidget,
} from "@/components/widgets"
import type { Task, TasksByDate, CategoriesByDate, HabitDefinition } from "@/lib/types"
import { formatISODate } from "@/lib/date-utils"

interface DashboardProps {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  selectedDate: Date
  weekStartsOn: 0 | 1
  onToggleComplete: (dateISO: string, taskId: string, completed: boolean) => void
  onQuickAdd?: () => void
  onSelectDate: (date: Date) => void
  onRefresh: () => void
}

export function Dashboard({
  tasksByDate,
  categoriesByDate,
  habits,
  selectedDate,
  weekStartsOn,
  onToggleComplete,
  onQuickAdd,
  onSelectDate,
  onRefresh,
}: DashboardProps) {
  const [layout, setLayout] = useState<DashboardLayout | null>(null)

  // Load layout on mount
  useEffect(() => {
    setLayout(loadDashboardLayout())
  }, [])

  const handleLayoutChange = useCallback((newLayout: DashboardLayout) => {
    setLayout(newLayout)
    saveDashboardLayout(newLayout)
  }, [])

  const handleReset = useCallback(() => {
    const defaultLayout = resetDashboardLayout()
    setLayout(defaultLayout)
  }, [])

  const handleToggleMinimized = useCallback((widgetId: string) => {
    if (!layout) return
    const newLayout = toggleWidgetMinimized(layout, widgetId)
    setLayout(newLayout)
    saveDashboardLayout(newLayout)
  }, [layout])

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  const todayISO = formatISODate(new Date())
  const todayTasks = tasksByDate[todayISO] || []
  const visibleWidgets = getVisibleWidgets(layout)

  const renderWidget = (widget: DashboardWidget) => {
    const commonProps = {
      size: widget.size,
      minimized: widget.minimized,
      onMinimize: () => handleToggleMinimized(widget.id),
    }

    switch (widget.type) {
      case 'TasksToday':
        return (
          <QuickTasksWidget
            key={widget.id}
            tasks={todayTasks}
            dateISO={todayISO}
            onToggleComplete={(taskId, completed) => onToggleComplete(todayISO, taskId, completed)}
            onRefresh={onRefresh}
            onQuickAdd={onQuickAdd}
            {...commonProps}
          />
        )

      case 'HabitStreak':
        return (
          <HabitStreakWidget
            key={widget.id}
            habits={habits}
            categoriesByDate={categoriesByDate}
            onRefresh={onRefresh}
            {...commonProps}
          />
        )

      case 'WeekProgress':
        return (
          <WeekProgressWidget
            key={widget.id}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            weekStartsOn={weekStartsOn}
            onRefresh={onRefresh}
            {...commonProps}
          />
        )

      case 'Pomodoro':
        return (
          <PomodoroWidget
            key={widget.id}
            {...commonProps}
          />
        )

      case 'Goals':
        return (
          <GoalsWidget
            key={widget.id}
            tasksByDate={tasksByDate}
            todayISO={todayISO}
            onRefresh={onRefresh}
            {...commonProps}
          />
        )

      case 'Calendar':
        return (
          <CalendarWidget
            key={widget.id}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            {...commonProps}
          />
        )

      case 'Notes':
        return (
          <NotesWidget
            key={widget.id}
            {...commonProps}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <DashboardCustomizer
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onReset={handleReset}
        />
      </div>

      {/* Widget Grid */}
      {visibleWidgets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No widgets visible. Click &quot;Customize&quot; to add widgets to your dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {visibleWidgets.map(widget => {
            const sizeConfig = WIDGET_SIZE_CONFIG[widget.size]
            return (
              <div
                key={widget.id}
                className={cn(
                  "min-h-[120px]",
                  widget.minimized && "min-h-0"
                )}
                style={{
                  gridColumn: `span ${Math.min(sizeConfig.cols, 4)}`,
                  gridRow: widget.minimized ? 'span 1' : `span ${sizeConfig.rows}`,
                }}
              >
                {renderWidget(widget)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
