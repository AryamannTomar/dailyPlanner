"use client"

import { addDays, formatISODate, getStartOfWeek, isSameDay, startOfMonth } from "@/lib/date-utils"
import type { FilterMode, TasksByDate, CategoriesByDate } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Props = {
  year: number
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  filterMode: FilterMode
  onChangeFilter: (m: FilterMode) => void
  selectedDate?: Date
  onChangeYear: (year: number) => void
  onSelectDate: (date: Date) => void
}

export default function YearStrip({
  year,
  tasksByDate,
  categoriesByDate,
  filterMode,
  onChangeFilter,
  selectedDate,
  onChangeYear,
  onSelectDate,
}: Props) {
  const CELL = 16
  const GAP = 3
  const today = new Date()

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

  const opacityFor = (pct: number) => {
    if (pct <= 0) return 0
    return 0.18 + (pct / 100) * 0.82
  }

  const jan1 = useMemo(() => new Date(year, 0, 1), [year])
  const dec31 = useMemo(() => new Date(year, 11, 31), [year])
  const gridStart = useMemo(() => getStartOfWeek(jan1), [jan1])
  const gridEnd = useMemo(() => {
    const endWeekStart = getStartOfWeek(dec31)
    return addDays(endWeekStart, 6)
  }, [dec31])

  const weeks: Date[][] = useMemo(() => {
    const wk: Date[][] = []
    let cur = new Date(gridStart)
    while (cur <= gridEnd) {
      const col: Date[] = []
      for (let i = 0; i < 7; i++) {
        col.push(addDays(cur, i))
      }
      wk.push(col)
      cur = addDays(cur, 7)
    }
    return wk
  }, [gridStart, gridEnd])

  const statsFor = (date: Date) => {
    const iso = formatISODate(date)
    const tasks = tasksByDate[iso] || []
    const cats = categoriesByDate[iso] || { water: false, meat: false, sleep: false, gym: false }
    if (filterMode === "tasks") {
      const completed = tasks.filter((t) => (t as any).completed).length
      const total = tasks.length
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
      return { pct, completed, total }
    }
    if (filterMode === "all") {
      const checks = [cats.water, cats.meat, cats.sleep, cats.gym]
      const doneAll = checks.every(Boolean)
      const count = checks.filter(Boolean).length
      const pct = doneAll ? 100 : 0
      return { pct, completed: count, total: 4 }
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
    return { pct, completed: v ? 1 : 0, total: 1 }
  }

  const monthLabels = useMemo(() => {
    const labels: { monthIndex: number; label: string; colIndex: number }[] = []
    for (let m = 0; m < 12; m++) {
      const mStart = startOfMonth(new Date(year, m, 1))
      const mStartWeek = getStartOfWeek(mStart)
      const colIndex = Math.floor((mStartWeek.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24 * 7))
      labels.push({
        monthIndex: m,
        label: mStart.toLocaleDateString(undefined, { month: "short" }),
        colIndex,
      })
    }
    return labels
  }, [gridStart, year])

  const totalWidth = useMemo(() => {
    const cols = weeks.length
    return cols * (CELL + GAP) - GAP
  }, [weeks.length])

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
        return { bg: `rgba(${base.r}, ${base.g}, ${base.b}, 1)`, br: `rgba(${base.r}, ${base.g}, ${base.b}, 0.95)` }
      }
      return { bg: neutralBg, br: neutralBr }
    }
  }

  return (
    <Card className="border-emerald-100">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onChangeYear(year - 1)} aria-label="Previous year">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium">{year}</div>
            <Button variant="ghost" size="icon" onClick={() => onChangeYear(year + 1)} aria-label="Next year">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

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

        <div className="overflow-x-auto">
          <div className="relative" style={{ width: totalWidth }}>
            <div className="h-6 relative select-none">
              {monthLabels.map((m, idx) => {
                const left = m.colIndex * (CELL + GAP)
                return (
                  <div key={m.monthIndex}>
                    {idx > 0 && (
                      <div
                        aria-hidden
                        className="absolute top-0 bottom-0 w-px bg-neutral-200"
                        style={{ left: left - Math.floor(GAP / 2) }}
                      />
                    )}
                    <div
                      className="absolute text-[10px] text-neutral-500"
                      style={{ left, transform: "translateX(2px)" }}
                      aria-hidden
                    >
                      {m.label}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-start" style={{ gap: GAP }}>
              {weeks.map((col, cIdx) => (
                <div key={cIdx} className="flex flex-col" style={{ gap: GAP }}>
                  {col.map((d, rIdx) => {
                    const { pct, completed, total } = statsFor(d)
                    const inYear = d >= jan1 && d <= dec31
                    const { bg, br } = computeCellColors(pct)
                    const isToday = isSameDay(d, today)
                    const isSelected = selectedDate ? isSameDay(d, selectedDate) : false

                    return (
                      <button
                        key={`${d.toISOString()}-${rIdx}`}
                        type="button"
                        onClick={() => onSelectDate(d)}
                        className={cn(
                          "rounded-[3px] border outline-offset-2 focus:outline-none focus:ring-2 transition-transform hover:scale-[1.06]",
                          "focus:ring-offset-0",
                          isSelected && !isToday && "ring-1 ring-neutral-400",
                        )}
                        title={`${d.toLocaleDateString()} — ${completed}/${total} (${filterMode})`}
                        style={{
                          width: CELL,
                          height: CELL,
                          backgroundColor: inYear ? bg : "#fafafa",
                          borderColor: inYear ? br : "#f0f0f0",
                          boxShadow: isToday ? "0 0 0 2px rgba(16,185,129,0.9) inset" : undefined,
                          opacity: inYear ? 1 : 0.5,
                          cursor: "pointer",
                        }}
                        aria-label={`${d.toLocaleDateString()} — ${completed}/${total} (${filterMode})`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
