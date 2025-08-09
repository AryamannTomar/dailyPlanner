"use client"

import { addDays, endOfMonth, formatISODate, getStartOfWeek, isSameDay, startOfMonth } from "@/lib/date-utils"
import type { TasksByDate } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function YearHeatmap({
  year,
  tasksByDate,
  onChangeYear,
  onSelectDate,
}: {
  year: number
  tasksByDate: TasksByDate
  onChangeYear: (year: number) => void
  onSelectDate: (date: Date) => void
}) {
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1))
  const emerald = { r: 16, g: 185, b: 129 }

  const opacityFor = (pct: number) => {
    if (pct <= 0) return 0
    return 0.18 + (pct / 100) * 0.82
  }

  const monthStats = (date: Date) => {
    const start = startOfMonth(date)
    const end = endOfMonth(date)
    let cur = new Date(start)
    let totalCompleted = 0
    let totalTasks = 0
    while (cur <= end) {
      const iso = formatISODate(cur)
      const tasks = tasksByDate[iso] || []
      totalCompleted += tasks.filter((t) => t.completed).length
      totalTasks += tasks.length
      cur = addDays(cur, 1)
    }
    const pct = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)
    return { pct, totalCompleted, totalTasks }
  }

  return (
    <Card className="border-emerald-100">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onChangeYear(year - 1)} aria-label="Previous year">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium">{year}</div>
            <Button variant="ghost" size="icon" onClick={() => onChangeYear(year + 1)} aria-label="Next year">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">{"Scroll to view all months"}</div>
        </div>

        <div className="max-h-[28rem] overflow-auto pr-1 space-y-4">
          {months.map((m) => {
            const label = m.toLocaleDateString(undefined, { month: "long" })
            const { pct } = monthStats(m)

            const monthStart = startOfMonth(m)
            const monthEnd = endOfMonth(m)
            const gridStart = getStartOfWeek(monthStart)
            const endWeekStart = getStartOfWeek(monthEnd)
            const gridEnd = addDays(endWeekStart, 6)

            const days: Date[] = []
            let cur = new Date(gridStart)
            while (cur <= gridEnd) {
              days.push(new Date(cur))
              cur = addDays(cur, 1)
            }
            const weeks: Date[][] = []
            for (let i = 0; i < days.length; i += 7) {
              weeks.push(days.slice(i, i + 7))
            }

            const monthAvgOpacity = opacityFor(pct)
            const badgeBg =
              pct === 0
                ? "#f3f4f6"
                : `rgba(${emerald.r}, ${emerald.g}, ${emerald.b}, ${Math.max(monthAvgOpacity, 0.3)})`
            const badgeBorder =
              pct === 0
                ? "#e5e7eb"
                : `rgba(${emerald.r}, ${emerald.g}, ${emerald.b}, ${Math.max(monthAvgOpacity - 0.2, 0.25)})`

            return (
              <div key={m.toISOString()} className="rounded-xl border p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">{label}</div>
                  <div
                    className="text-[11px] px-2 py-0.5 rounded border"
                    style={{ backgroundColor: badgeBg, borderColor: badgeBorder }}
                  >
                    {pct}
                    {"% avg"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex flex-col justify-between py-1 pr-1 text-[9px] text-muted-foreground">
                    {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                      <div key={i} className="h-3 leading-3 hidden sm:block">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1 overflow-x-auto">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((d) => {
                          const inMonth = d >= monthStart && d <= monthEnd
                          const iso = formatISODate(d)
                          const tasks = tasksByDate[iso] || []
                          const completed = tasks.filter((t) => t.completed).length
                          const total = tasks.length
                          const pctDay = total === 0 ? 0 : Math.round((completed / total) * 100)
                          const op = opacityFor(pctDay)
                          const bg = pctDay === 0 ? "#f3f4f6" : `rgba(${emerald.r}, ${emerald.g}, ${emerald.b}, ${op})`
                          const br =
                            pctDay === 0
                              ? "#e5e7eb"
                              : `rgba(${emerald.r}, ${emerald.g}, ${emerald.b}, ${Math.max(op - 0.2, 0.25)})`
                          const isToday = isSameDay(d, new Date())

                          return (
                            <button
                              key={d.toISOString()}
                              type="button"
                              onClick={() => onSelectDate(d)}
                              className={cn(
                                "h-3.5 w-3.5 rounded-[3px] border outline-offset-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-transform hover:scale-[1.06]",
                              )}
                              title={`${d.toLocaleDateString()} — ${completed}/${total}`}
                              style={{
                                backgroundColor: inMonth ? bg : "#fafafa",
                                borderColor: inMonth ? br : "#f0f0f0",
                                boxShadow: isToday ? "0 0 0 1px rgba(16,185,129,0.8) inset" : undefined,
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
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
