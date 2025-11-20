"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  RefreshCw,
  Minus,
  Maximize2,
  CheckCircle2,
  Circle,
} from "lucide-react"
import type { TasksByDate } from "@/lib/types"
import { formatISODate, getWeekDates, getStartOfWeek } from "@/lib/date-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface WeekProgressWidgetProps {
  tasksByDate: TasksByDate
  selectedDate: Date
  weekStartsOn: 0 | 1
  size: WidgetSize
  minimized: boolean
  onRefresh: () => void
  onMinimize: () => void
}

export function WeekProgressWidget({
  tasksByDate,
  selectedDate,
  weekStartsOn,
  size,
  minimized,
  onRefresh,
  onMinimize,
}: WeekProgressWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const weekStart = useMemo(() => getStartOfWeek(selectedDate, weekStartsOn), [selectedDate, weekStartsOn])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  const weekStats = useMemo(() => {
    let totalCompleted = 0
    let totalTasks = 0
    const dailyStats: { date: Date; completed: number; total: number }[] = []

    for (const date of weekDates) {
      const iso = formatISODate(date)
      const tasks = tasksByDate[iso] || []
      const completed = tasks.filter(t => t.completed).length
      const total = tasks.length
      totalCompleted += completed
      totalTasks += total
      dailyStats.push({ date, completed, total })
    }

    const percent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)
    return { totalCompleted, totalTasks, percent, dailyStats }
  }, [tasksByDate, weekDates])

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = new Date()
  const todayISO = formatISODate(today)

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Week</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{weekStats.percent}%</span>
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
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Week Progress
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-6 w-6 p-0"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3">
        {/* Overall progress */}
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-blue-600">{weekStats.percent}%</div>
          <div className="text-xs text-muted-foreground">
            {weekStats.totalCompleted}/{weekStats.totalTasks} tasks completed
          </div>
        </div>

        {/* Daily breakdown */}
        <div className="grid grid-cols-7 gap-1">
          {weekStats.dailyStats.map(({ date, completed, total }, index) => {
            const iso = formatISODate(date)
            const isToday = iso === todayISO
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

            return (
              <div
                key={iso}
                className={cn(
                  "text-center p-1 rounded",
                  isToday && "bg-blue-50 dark:bg-blue-950"
                )}
              >
                <div className={cn(
                  "text-[10px] font-medium",
                  isToday ? "text-blue-600" : "text-muted-foreground"
                )}>
                  {dayNames[date.getDay()]}
                </div>
                <div className="mt-1">
                  {total === 0 ? (
                    <Circle className="h-4 w-4 mx-auto text-muted-foreground/30" />
                  ) : percent === 100 ? (
                    <CheckCircle2 className="h-4 w-4 mx-auto text-emerald-500" />
                  ) : (
                    <div className="relative h-4 w-4 mx-auto">
                      <svg viewBox="0 0 16 16" className="h-4 w-4">
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-muted-foreground/20"
                        />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${percent * 0.377} 100`}
                          strokeLinecap="round"
                          transform="rotate(-90 8 8)"
                          className="text-blue-500"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  {completed}/{total}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
