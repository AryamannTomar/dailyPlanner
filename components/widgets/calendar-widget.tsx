"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Minus,
  Maximize2,
} from "lucide-react"
import type { TasksByDate } from "@/lib/types"
import { formatISODate } from "@/lib/date-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface CalendarWidgetProps {
  tasksByDate: TasksByDate
  selectedDate: Date
  size: WidgetSize
  minimized: boolean
  onSelectDate: (date: Date) => void
  onMinimize: () => void
}

export function CalendarWidget({
  tasksByDate,
  selectedDate,
  size,
  minimized,
  onSelectDate,
  onMinimize,
}: CalendarWidgetProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate))

  const today = new Date()
  const todayISO = formatISODate(today)

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()

    // Last day of month
    const lastDay = new Date(year, month + 1, 0)
    const totalDays = lastDay.getDate()

    // Previous month days to show
    const prevMonthLastDay = new Date(year, month, 0).getDate()

    const days: { date: Date; isCurrentMonth: boolean; taskCount: number }[] = []

    // Previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      const iso = formatISODate(date)
      const tasks = tasksByDate[iso] || []
      days.push({ date, isCurrentMonth: false, taskCount: tasks.length })
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i)
      const iso = formatISODate(date)
      const tasks = tasksByDate[iso] || []
      days.push({ date, isCurrentMonth: true, taskCount: tasks.length })
    }

    // Next month
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      const iso = formatISODate(date)
      const tasks = tasksByDate[iso] || []
      days.push({ date, isCurrentMonth: false, taskCount: tasks.length })
    }

    return days
  }, [viewDate, tasksByDate])

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  const selectedISO = formatISODate(selectedDate)

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium">Calendar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{monthName}</span>
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
            <CalendarIcon className="h-4 w-4 text-indigo-500" />
            Calendar
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minus className="h-3 w-3" />
          </Button>
        </div>
        {/* Month navigation */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="h-6 w-6 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium">{monthName}</span>
          <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-6 w-6 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3">
        {/* Day names */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[10px] font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map(({ date, isCurrentMonth, taskCount }, i) => {
            const iso = formatISODate(date)
            const isToday = iso === todayISO
            const isSelected = iso === selectedISO

            return (
              <button
                key={i}
                onClick={() => onSelectDate(date)}
                className={cn(
                  "relative aspect-square flex items-center justify-center text-[10px] rounded transition-colors",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground hover:bg-muted",
                  isToday && "bg-indigo-100 dark:bg-indigo-950 font-bold",
                  isSelected && "ring-1 ring-indigo-500"
                )}
              >
                {date.getDate()}
                {taskCount > 0 && (
                  <span className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    isCurrentMonth ? "bg-emerald-500" : "bg-emerald-500/30"
                  )} />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
