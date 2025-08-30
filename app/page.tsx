"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, formatISODate, getStartOfWeek, getWeekDates, isSameDay, toLabelDate } from "@/lib/date-utils"
import type { CategoriesByDate, CategoryKey, CategoryState, FilterMode, Task, TasksByDate } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import DayCard from "@/components/day-card"
import ProgressCircle from "@/components/progress-circle"
import CalendarHeatmap from "@/components/calendar-heatmap"
import YearStrip from "@/components/year-strip"
import ThemeToggle from "@/components/theme-toggle"
import FlipClock from "@/components/flip-clock"

export default function Page() {
  // Selected date controls which week/month/year to show
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<"week" | "month" | "year">("week")

  // Build the seven days for the current week (Mon-Sun)
  const weekStart = useMemo(() => getStartOfWeek(selectedDate), [selectedDate])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  // Local task state keyed by ISO yyyy-mm-dd
  const [tasksByDate, setTasksByDate] = useState<TasksByDate>({})
  const [categoriesByDate, setCategoriesByDate] = useState<CategoriesByDate>({})
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

  // Month/Year filter
  const [mode, setMode] = useState<FilterMode>("tasks")

  // Load all data once when component mounts
  useEffect(() => {
    let cancelled = false
    async function loadAllData() {
      setIsLoading(true)
      try {
        // Load data for a wider range (e.g., 3 months around current date)
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 1)
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1)
        
        const allDates: Date[] = []
        const current = new Date(startDate)
        while (current <= endDate) {
          allDates.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }

        const tasksEntries = await Promise.all(
          allDates.map(async (d) => {
            const iso = formatISODate(d)
            try {
              const res = await fetch(`/api/tasks/${iso}`, { cache: 'no-store' })
              if (!res.ok) {
                console.error(`Failed to fetch tasks for ${iso}:`, res.status, res.statusText)
                return [iso, []] as const
              }
              const data = await res.json()
              return [iso, (data.tasks || [])] as const
            } catch (error) {
              console.error(`Error fetching tasks for ${iso}:`, error)
              return [iso, []] as const
            }
          }),
        )
        const categoriesEntries = await Promise.all(
          allDates.map(async (d) => {
            const iso = formatISODate(d)
            try {
              const res = await fetch(`/api/categories/${iso}`, { cache: 'no-store' })
              if (!res.ok) {
                console.error(`Failed to fetch categories for ${iso}:`, res.status, res.statusText)
                return [iso, { water: false, meat: false, sleep: false, gym: false }] as const
              }
              const data = await res.json()
              return [iso, data.categories] as const
            } catch (error) {
              console.error(`Error fetching categories for ${iso}:`, error)
              return [iso, { water: false, meat: false, sleep: false, gym: false }] as const
            }
          }),
        )
        if (!cancelled) {
          setTasksByDate(Object.fromEntries(tasksEntries))
          setCategoriesByDate(Object.fromEntries(categoriesEntries))
          setIsLoading(false)
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        if (!cancelled) {
          setIsLoading(false)
          setIsInitialized(true)
        }
      }
    }
    loadAllData()
    return () => {
      cancelled = true
    }
  }, []) // Empty dependency array - only run once on mount

  const handleToggleComplete = async (dateISO: string, taskId: string, completed: boolean) => {
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, completed }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({
      ...prev,
      [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)),
    }))
  }

  const handleUpdateActualEndTime = async (dateISO: string, taskId: string, newTime: string) => {
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, actualEndTime: newTime }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({
      ...prev,
      [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)),
    }))
  }

  const handleAddTask = async (
    dateISO: string,
    newTask: { startTime: string; approxEndTime: string; description: string },
  ) => {
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
    if (!res.ok) return
    const created: Task = await res.json()
    setTasksByDate((prev) => {
      const list = [...(prev[dateISO] || []), created]
      list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
      return { ...prev, [dateISO]: list }
    })
  }

  const handleToggleCategory = async (dateISO: string, key: CategoryKey, value: boolean) => {
    const res = await fetch(`/api/categories/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) return
    const data = await res.json()
    setCategoriesByDate((prev) => ({ ...prev, [dateISO]: data.categories }))
  }

  const handleDeleteTask = async (dateISO: string, taskId: string) => {
    const res = await fetch(`/api/tasks/${dateISO}?id=${encodeURIComponent(taskId)}`, { method: 'DELETE' })
    if (!res.ok) return
    setTasksByDate((prev) => ({
      ...prev,
      [dateISO]: (prev[dateISO] || []).filter((t) => t.id !== taskId),
    }))
  }

  // Compute weekly average completion (tasks mode only for top summary)
  const { weeklyPercent, completedCount, totalCount } = useMemo(() => {
    let totalCompleted = 0
    let totalTasks = 0
    for (const d of weekDates) {
      const iso = formatISODate(d)
      const tasks = tasksByDate[iso] || []
      const dayCompleted = tasks.filter((t) => t.completed).length
      totalCompleted += dayCompleted
      totalTasks += tasks.length
    }
    const pct = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)
    return { weeklyPercent: pct, completedCount: totalCompleted, totalCount: totalTasks }
  }, [tasksByDate, weekDates])

  const goPrevWeek = () => setSelectedDate(addDays(weekStart, -7))
  const goNextWeek = () => setSelectedDate(addDays(weekStart, 7))

  const openWeekFor = (date: Date) => {
    const iso = formatISODate(date)
    setSelectedDate(date)
    setView("week")
    setTimeout(() => {
      const el = document.getElementById(`day-${iso}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 30)
  }

  const currentYear = selectedDate.getFullYear()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isLoading && !isInitialized && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading data…</span>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              DF
            </div>
            <span className="text-lg font-semibold">Daily Flow</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goPrevWeek} aria-label="Previous week">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{`${toLabelDate(weekDates[0])} - ${toLabelDate(weekDates[6])}`}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={goNextWeek} aria-label="Next week">
              <ChevronRight className="h-5 w-5" />
            </Button>
            <label className="sr-only" htmlFor="date">
              Select date
            </label>
            <Input
              id="date"
              type="date"
              value={formatISODate(selectedDate)}
              onChange={(e) => {
                const v = e.target.value
                if (v) setSelectedDate(new Date(v + "T00:00:00"))
              }}
              className="w-[9.5rem]"
            />
            <FlipClock />
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3">
          <Card className="border-emerald-100">
            <CardContent className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <ProgressCircle percent={weeklyPercent} size={44} strokeWidth={6} />
                <div>
                  <div className="text-sm font-medium">Weekly progress</div>
                  <div className="text-xs text-muted-foreground">{`${completedCount}/${totalCount} tasks completed`}</div>
                </div>
              </div>
              <div className="hidden sm:block text-sm text-muted-foreground">
                {"Week of "}
                {toLabelDate(weekDates[0])}
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-4">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="w-full">
            <div className="flex items-center justify-between mb-3">
              <TabsList className="bg-muted">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="week" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {weekDates.map((date) => {
                  const iso = formatISODate(date)
                  const tasks = tasksByDate[iso] || []
                  const cats = categoriesByDate[iso] || { water: false, meat: false, sleep: false, gym: false }
                  const today = new Date()
                  const isToday = isSameDay(date, today)
                  return (
                    <div key={iso} id={`day-${iso}`} className="scroll-mt-24">
                      <DayCard
                        date={date}
                        tasks={tasks}
                        categories={cats}
                        dateISO={iso}
                        isToday={isToday}
                        onToggleComplete={(taskId, completed) => handleToggleComplete(iso, taskId, completed)}
                        onAddTask={(t) => handleAddTask(iso, t)}
                        onToggleCategory={(key, value) => handleToggleCategory(iso, key, value)}
                        onUpdateEndTime={(taskId, newTime) => handleUpdateActualEndTime(iso, taskId, newTime)}
                        onDeleteTask={(taskId) => handleDeleteTask(iso, taskId)}
                      />
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              <CalendarHeatmap
                monthDate={selectedDate}
                tasksByDate={tasksByDate}
                categoriesByDate={categoriesByDate}
                filterMode={mode}
                onChangeFilter={setMode}
                selectedDate={selectedDate}
                onChangeMonth={(d) => setSelectedDate(d)}
                onSelectDate={(d) => setSelectedDate(d)}
                onOpenWeek={(d) => openWeekFor(d)}
              />
            </TabsContent>

            <TabsContent value="year" className="mt-0">
              <YearStrip
                year={currentYear}
                tasksByDate={tasksByDate}
                categoriesByDate={categoriesByDate}
                filterMode={mode}
                onChangeFilter={setMode}
                selectedDate={selectedDate}
                onChangeYear={(y) => setSelectedDate(new Date(y, selectedDate.getMonth(), selectedDate.getDate()))}
                onSelectDate={(d) => {
                  setSelectedDate(d)
                  setView("month")
                }}
              />
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
        {"This UI is client-rendered to support local state, events, and interactivity."}
      </footer>
    </div>
  )
}