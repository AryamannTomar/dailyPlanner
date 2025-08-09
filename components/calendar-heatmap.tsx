"use client"

import {
  addDays,
  addMonths,
  endOfMonth,
  formatISODate,
  getStartOfWeek,
  isSameDay,
  startOfMonth,
  toLabelDate,
} from "@/lib/date-utils"
import type { FilterMode, Task, TasksByDate, CategoriesByDate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react"
import { useMemo, useState } from "react"
import ProgressCircle from "@/components/progress-circle"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatDurationHuman } from "@/lib/time-utils"

export default function CalendarHeatmap({
  monthDate,
  tasksByDate,
  categoriesByDate,
  selectedDate,
  filterMode,
  onChangeFilter,
  onSelectDate,
  onChangeMonth,
  onOpenWeek,
}: {
  monthDate: Date
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  selectedDate?: Date
  filterMode: FilterMode
  onChangeFilter: (m: FilterMode) => void
  onSelectDate: (date: Date) => void
  onChangeMonth: (date: Date) => void
  onOpenWeek?: (date: Date) => void
}) {
  const CELL = 16
  const GAP = 3
  const today = new Date()

  const monthStart = useMemo(() => startOfMonth(monthDate), [monthDate])
  const monthEnd = useMemo(() => endOfMonth(monthDate), [monthDate])

  const gridStart = useMemo(() => getStartOfWeek(monthStart), [monthStart])
  const gridEnd = useMemo(() => {
    const endWeekStart = getStartOfWeek(monthEnd)
    return addDays(endWeekStart, 6)
  }, [monthEnd])

  const days: Date[] = useMemo(() => {
    const d: Date[] = []
    let cur = new Date(gridStart)
    while (cur <= gridEnd) {
      d.push(new Date(cur))
      cur = addDays(cur, 1)
    }
    return d
  }, [gridStart, gridEnd])

  const weeks: Date[][] = useMemo(() => {
    const w: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7))
    }
    return w
  }, [days])

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const baseColorRGB = (mode: FilterMode) => {
    switch (mode) {
      case "water":
        return { r: 14, g: 165, b: 233 }
      case "meat":
        return { r: 236, g: 72, b: 153 }
      case "sleep":
        return { r: 167, g: 139, b: 250 }
      case "gym":
        return { r: 249, g: 115, b: 22 }
      case "all":
        return { r: 181, g: 223, b: 215 } // #b5dfd7
      case "tasks":
      default:
        return { r: 16, g: 185, b: 129 }
    }
  }

  const getStats = (date: Date) => {
    const iso = formatISODate(date)
    const tasks = tasksByDate[iso] || []
    const cats = categoriesByDate[iso] || { water: false, meat: false, sleep: false, gym: false }
    if (filterMode === "tasks") {
      const completed = tasks.filter((t) => t.completed).length
      const total = tasks.length
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
      return { pct, completed, total, tasks }
    }
    if (filterMode === "all") {
      const checks = [cats.water, cats.meat, cats.sleep, cats.gym]
      const doneAll = checks.every(Boolean)
      const count = checks.filter(Boolean).length
      const pct = doneAll ? 100 : 0
      return { pct, completed: count, total: 4, tasks }
    }
    const v =
      filterMode === "water"
        ? cats.water
        : filterMode === "meat"
          ? cats.meat
          : filterMode === "sleep"
            ? cats.sleep
            : cats.gym
    const pct = v ? 100 : 0
    return { pct, completed: v ? 1 : 0, total: 1, tasks }
  }

  const opacityFor = (pct: number) => {
    if (pct <= 0) return 0
    return 0.18 + (pct / 100) * 0.82
  }

  const initialActive =
    selectedDate && selectedDate >= monthStart && selectedDate <= monthEnd ? selectedDate : monthStart
  const [activeDate, setActiveDate] = useState<Date>(initialActive)
  const active = getStats(activeDate)

  const modeLabel = (m: FilterMode) =>
    m === "tasks" ? "Tasks" : m === "all" ? "All 4" : m[0].toUpperCase() + m.slice(1)

  const base = baseColorRGB(filterMode)

  const computeCellColors = (pct: number) => {
    const neutralBg = "#f3f4f6"
    const neutralBr = "#e5e7eb"

    if (filterMode === "tasks") {
      const op = opacityFor(pct)
      if (pct === 0) return { bg: neutralBg, br: neutralBr }
      return {
        bg: `rgba(${base.r}, ${base.g}, ${base.b}, ${op})`,
        br: `rgba(${base.r}, ${base.g}, ${base.b}, ${Math.max(op - 0.2, 0.25)})`,
      }
    } else {
      if (pct === 100) {
        return {
          bg: `rgba(${base.r}, ${base.g}, ${base.b}, 1)`,
          br: `rgba(${base.r}, ${base.g}, ${base.b}, 0.95)`,
        }
      }
      return { bg: neutralBg, br: neutralBr }
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChangeMonth(addMonths(monthStart, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium">
              {monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChangeMonth(addMonths(monthStart, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {filterMode === "tasks" && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{"Less"}</span>
                <div className="flex items-center gap-1">
                  {[0, 25, 50, 75, 100].map((v) => {
                    const op = opacityFor(v)
                    const bg = v === 0 ? "#f3f4f6" : `rgba(${base.r}, ${base.g}, ${base.b}, ${op})`
                    const br = v === 0 ? "#e5e7eb" : `rgba(${base.r}, ${base.g}, ${base.b}, ${Math.max(op - 0.2, 0.2)})`
                    return (
                      <div
                        key={v}
                        aria-hidden
                        className="h-4 w-4 rounded-[3px] border"
                        style={{ backgroundColor: bg, borderColor: br }}
                        title={`${v}%`}
                      />
                    )
                  })}
                </div>
                <span>{"More"}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-xs text-muted-foreground">View</div>
              <Select value={filterMode} onValueChange={(v) => onChangeFilter(v as FilterMode)}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="meat">Meat</SelectItem>
                  <SelectItem value="sleep">Sleep</SelectItem>
                  <SelectItem value="gym">Gym</SelectItem>
                  <SelectItem value="all">All 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex gap-2">
            <div className="flex flex-col pr-1 text-[10px] text-muted-foreground" style={{ gap: GAP }}>
              {weekdays.map((label) => (
                <div key={label} className="flex items-center" style={{ height: CELL }}>
                  {label}
                </div>
              ))}
            </div>

            <div className="flex overflow-x-auto" style={{ gap: GAP }}>
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((d) => {
                    const inMonth = d >= monthStart && d <= monthEnd
                    const { pct, completed, total } = getStats(d)
                    const isToday = isSameDay(d, today)
                    const isActive = isSameDay(d, activeDate)
                    const { bg, br } = computeCellColors(pct)

                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => {
                          setActiveDate(d)
                          onSelectDate(d)
                        }}
                        aria-label={`${toLabelDate(d)} — ${completed}/${total} (${modeLabel(filterMode)})`}
                        title={`${toLabelDate(d)} — ${completed}/${total} (${modeLabel(filterMode)})`}
                        className={cn(
                          "rounded-[3px] border outline-offset-2 focus:outline-none focus:ring-2 transition-transform hover:scale-[1.06]",
                          "focus:ring-offset-0",
                          isActive && !isToday && "ring-1 ring-neutral-400",
                        )}
                        style={{
                          width: CELL,
                          height: CELL,
                          backgroundColor: inMonth ? bg : "#fafafa",
                          borderColor: inMonth ? br : "#f0f0f0",
                          boxShadow: isToday ? "0 0 0 2px rgba(16,185,129,0.9) inset" : undefined,
                          opacity: inMonth ? 1 : 0.5,
                          cursor: "pointer",
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <Card className="border-emerald-100">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ProgressCircle
                    percent={active.pct}
                    size={44}
                    strokeWidth={6}
                    progressColor={`rgb(${base.r} ${base.g} ${base.b})`}
                  />
                </div>

                {filterMode !== "tasks" ? (
                  <div className="text-xs text-muted-foreground">{"Switch to Tasks view to see the task list."}</div>
                ) : active.total === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-lg p-3">{"No tasks for this day."}</div>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                    {(getStats(activeDate).tasks as Task[]).map((t: Task) => {
                      const times = t.completed
                        ? `${t.startTime} → ${t.actualEndTime ?? ""}`
                        : `${t.startTime} → ${t.approxEndTime}`
                      const delta =
                        t.completed && typeof t.durationSeconds === "number"
                          ? ` • Δ ${formatDurationHuman(t.durationSeconds)}`
                          : ""
                      return (
                        <li
                          key={t.id}
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm shadow-sm bg-white"
                        >
                          <CheckCircle2
                            className={cn("h-4 w-4", t.completed ? "text-emerald-600" : "text-neutral-300")}
                            aria-hidden
                          />
                          <span className="w-28 shrink-0 text-xs text-muted-foreground">{times}</span>
                          <span className={cn(t.completed ? "line-through text-muted-foreground" : "")}>
                            {t.description}
                          </span>
                          {delta && <span className="ml-auto text-[11px] text-muted-foreground">{delta}</span>}
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="mt-3">
                  {onOpenWeek && (
                    <Button size="sm" variant="outline" onClick={() => onOpenWeek(activeDate)}>
                      Open in Week view
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
