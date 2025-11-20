"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { addDays, formatISODate, getStartOfWeek, getWeekDates, getWeekDays, isSameDay, toLabelDate } from "@/lib/date-utils"
import { getSettings, saveSettings, type WeekStartDay } from "@/lib/settings-utils"
import type { CategoriesByDate, CategoryKey, CategoryState, FilterMode, Task, TasksByDate, HabitDefinition } from "@/lib/types"
import { isHabitCompleted } from "@/lib/types"
import { getCarryOverSuggestions, getTodayISO, getYesterdayISO } from "@/lib/carryover-utils"
import { type SearchFilters, defaultFilters, hasActiveFilters, flattenTasksByDate, filterTasks, getAllTags, type TaskWithDate } from "@/lib/search-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Target, Flame, Printer, LayoutDashboard, List } from "lucide-react"
import DayCard from "@/components/day-card"
import ProgressCircle from "@/components/progress-circle"
import CalendarHeatmap from "@/components/calendar-heatmap"
import YearStrip from "@/components/year-strip"
import ThemeToggle from "@/components/theme-toggle"
import ThemePicker from "@/components/theme-picker"
import SettingsDialog from "@/components/settings-dialog"
import FlipClock from "@/components/flip-clock"
import HabitStreaks, { CompactHabitStreaks } from "@/components/habit-streaks"
import { CompactTaskStreak, TaskStreakDialog } from "@/components/task-streaks"
import TaskStreaks from "@/components/task-streaks"
import StatisticsDialog from "@/components/statistics-dialog"
import ReportsDialog from "@/components/reports"
import CarryOverDialog, { CarryOverBanner } from "@/components/carryover-dialog"
import DuplicateTaskDialog from "@/components/duplicate-task-dialog"
import FocusMode from "@/components/focus-mode"
import SearchFilter from "@/components/search-filter"
import KeyboardShortcutsHelp from "@/components/keyboard-shortcuts-help"
import { useKeyboardShortcuts, type ShortcutHandler } from "@/hooks/use-keyboard-shortcuts"
import QuickAddTask, { QuickAddButton } from "@/components/quick-add-task"
import CalendarExport from "@/components/calendar-export"
import DataExport from "@/components/data-export"
import DataImport from "@/components/data-import"
import PrintDialog from "@/components/print-dialog"
import BackupManager from "@/components/backup-manager"
import { Dashboard } from "@/components/dashboard"
import { type DashboardViewMode, loadViewMode, saveViewMode } from "@/lib/dashboard-utils"
import { toast } from "sonner"

export default function Page() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [view, setView] = useState<"week" | "month" | "year">("week")
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartDay>(1)
  const weekStart = useMemo(() => getStartOfWeek(selectedDate, weekStartsOn), [selectedDate, weekStartsOn])
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const [tasksByDate, setTasksByDate] = useState<TasksByDate>({})
  const [categoriesByDate, setCategoriesByDate] = useState<CategoriesByDate>({})
  const [habits, setHabits] = useState<HabitDefinition[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [mode, setMode] = useState<FilterMode>("tasks")
  const [carryOverDialogOpen, setCarryOverDialogOpen] = useState<boolean>(false)
  const [carryOverTasks, setCarryOverTasks] = useState<Task[]>([])
  const [carryOverDismissed, setCarryOverDismissed] = useState<boolean>(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState<boolean>(false)
  const [taskToDuplicate, setTaskToDuplicate] = useState<Task | null>(null)
  const [duplicateSourceDate, setDuplicateSourceDate] = useState<string>("")
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState<boolean>(false)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultFilters)
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false)
  const [quickAddOpen, setQuickAddOpen] = useState<boolean>(false)
  const [focusModeActive, setFocusModeActive] = useState<boolean>(false)
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)
  const [focusDateISO, setFocusDateISO] = useState<string>("")
  const [usedFreezes, setUsedFreezes] = useState<string[]>([])
  const [printDialogOpen, setPrintDialogOpen] = useState<boolean>(false)
  const [dashboardViewMode, setDashboardViewMode] = useState<DashboardViewMode>("standard")

  useEffect(() => {
    const savedFreezes = localStorage.getItem("taskStreakFreezes")
    if (savedFreezes) {
      try {
        setUsedFreezes(JSON.parse(savedFreezes))
      } catch {
        setUsedFreezes([])
      }
    }
  }, [])

  useEffect(() => {
    const settings = getSettings()
    setWeekStartsOn(settings.weekStartsOn)
  }, [])

  useEffect(() => {
    setDashboardViewMode(loadViewMode())
  }, [])

  const handleUseFreeze = useCallback(() => {
    const todayISO = getTodayISO()
    if (usedFreezes.includes(todayISO)) return
    const newFreezes = [...usedFreezes, todayISO]
    setUsedFreezes(newFreezes)
    localStorage.setItem("taskStreakFreezes", JSON.stringify(newFreezes))
    toast.success("Streak freeze used", { description: "Your streak is protected for today!" })
  }, [usedFreezes])

  const handleWeekStartsOnChange = useCallback((value: WeekStartDay) => {
    setWeekStartsOn(value)
    saveSettings({ weekStartsOn: value })
    toast.success("Week start updated", { description: value === 0 ? "Week now starts on Sunday" : "Week now starts on Monday" })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadAllData() {
      setIsLoading(true)
      try {
        const habitsRes = await fetch('/api/habits', { cache: 'no-store' })
        if (habitsRes.ok) {
          const habitsData = await habitsRes.json()
          if (!cancelled) setHabits(habitsData.habits || [])
        }
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
              if (!res.ok) return [iso, []] as const
              const data = await res.json()
              return [iso, (data.tasks || [])] as const
            } catch {
              return [iso, []] as const
            }
          }),
        )
        const categoriesEntries = await Promise.all(
          allDates.map(async (d) => {
            const iso = formatISODate(d)
            try {
              const res = await fetch(`/api/categories/${iso}`, { cache: 'no-store' })
              if (!res.ok) return [iso, {}] as const
              const data = await res.json()
              return [iso, data.categories] as const
            } catch {
              return [iso, {}] as const
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
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    const dismissedDate = localStorage.getItem("carryOverDismissedDate")
    const today = getTodayISO()
    if (dismissedDate === today) {
      setCarryOverDismissed(true)
      return
    }
    const { tasks } = getCarryOverSuggestions(tasksByDate)
    setCarryOverTasks(tasks)
  }, [isInitialized, tasksByDate])

  const handleCarryOver = async (taskIds: string[], deleteOriginals: boolean) => {
    const fromDate = getYesterdayISO()
    const toDate = getTodayISO()
    try {
      const res = await fetch("/api/tasks/carryover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromDate, toDate, taskIds, deleteOriginals }),
      })
      if (!res.ok) throw new Error("Failed to carry over tasks")
      const data = await res.json()
      setTasksByDate(prev => ({ ...prev, [toDate]: data.updatedTargetTasks, [fromDate]: data.updatedSourceTasks }))
      setCarryOverTasks([])
    } catch (error) {
      console.error("Failed to carry over tasks:", error)
      throw error
    }
  }

  const handleDismissCarryOver = () => {
    localStorage.setItem("carryOverDismissedDate", getTodayISO())
    setCarryOverDismissed(true)
  }

  const handleToggleComplete = async (dateISO: string, taskId: string, completed: boolean) => {
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, completed }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)) }))
  }

  const handleUpdateActualEndTime = async (dateISO: string, taskId: string, newTime: string) => {
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, actualEndTime: newTime }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)) }))
  }

  const handleAddTask = async (dateISO: string, newTask: { startTime: string; approxEndTime: string; description: string }) => {
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
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).filter((t) => t.id !== taskId) }))
  }

  const handleToggleSubtask = async (dateISO: string, taskId: string, subtaskId: string, completed: boolean) => {
    const tasks = tasksByDate[dateISO] || []
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const updatedSubtasks = (task.subtasks || []).map((s) => s.id === subtaskId ? { ...s, completed } : s)
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, subtasks: updatedSubtasks }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)) }))
  }

  const handleAddSubtask = async (dateISO: string, taskId: string, description: string) => {
    const tasks = tasksByDate[dateISO] || []
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const newSubtask = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, description, completed: false }
    const updatedSubtasks = [...(task.subtasks || []), newSubtask]
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, subtasks: updatedSubtasks }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)) }))
  }

  const handleDeleteSubtask = async (dateISO: string, taskId: string, subtaskId: string) => {
    const tasks = tasksByDate[dateISO] || []
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const updatedSubtasks = (task.subtasks || []).filter((s) => s.id !== subtaskId)
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, subtasks: updatedSubtasks }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setTasksByDate((prev) => ({ ...prev, [dateISO]: (prev[dateISO] || []).map((t) => (t.id === taskId ? updated : t)) }))
  }

  const handleOpenDuplicateDialog = (dateISO: string, task: Task) => {
    setTaskToDuplicate(task)
    setDuplicateSourceDate(dateISO)
    setDuplicateDialogOpen(true)
  }

  const handleDuplicateTask = async (taskId: string, fromDate: string, toDates: string[]) => {
    for (const toDate of toDates) {
      const res = await fetch('/api/tasks/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, fromDate, toDate }),
      })
      if (!res.ok) continue
      const duplicatedTask: Task = await res.json()
      setTasksByDate((prev) => {
        const list = [...(prev[toDate] || []), duplicatedTask]
        list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
        return { ...prev, [toDate]: list }
      })
    }
  }

  const handleIncrementHabit = async (dateISO: string, key: CategoryKey) => {
    const res = await fetch(`/api/categories/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, increment: true }),
    })
    if (!res.ok) return
    const data = await res.json()
    setCategoriesByDate((prev) => ({ ...prev, [dateISO]: data.categories }))
  }

  const handleDecrementHabit = async (dateISO: string, key: CategoryKey) => {
    const res = await fetch(`/api/categories/${dateISO}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, decrement: true }),
    })
    if (!res.ok) return
    const data = await res.json()
    setCategoriesByDate((prev) => ({ ...prev, [dateISO]: data.categories }))
  }

  const handleReorder = async (dateISO: string, taskIds: string[]) => {
    setTasksByDate((prev) => {
      const tasks = prev[dateISO] || []
      const taskMap = new Map(tasks.map((t) => [t.id, t]))
      const reorderedTasks: Task[] = []
      taskIds.forEach((id, index) => {
        const task = taskMap.get(id)
        if (task) reorderedTasks.push({ ...task, order: index })
      })
      return { ...prev, [dateISO]: reorderedTasks }
    })
    const res = await fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateISO, taskIds }),
    })
    if (!res.ok) {
      const refetchRes = await fetch(`/api/tasks/${dateISO}`, { cache: 'no-store' })
      if (refetchRes.ok) {
        const data = await refetchRes.json()
        setTasksByDate((prev) => ({ ...prev, [dateISO]: data.tasks || [] }))
      }
      toast.error("Failed to reorder tasks")
    }
  }

  const handleStartFocusMode = useCallback((dateISO: string, taskId?: string) => {
    const tasks = tasksByDate[dateISO] || []
    const incompleteTasks = tasks.filter(t => !t.completed)
    if (incompleteTasks.length === 0) return
    setFocusDateISO(dateISO)
    if (taskId && incompleteTasks.find(t => t.id === taskId)) {
      setFocusedTaskId(taskId)
    } else {
      setFocusedTaskId(incompleteTasks[0].id)
    }
    setFocusModeActive(true)
  }, [tasksByDate])

  const handleFocusModeComplete = useCallback(async (taskId: string) => {
    await handleToggleComplete(focusDateISO, taskId, true)
    const tasks = tasksByDate[focusDateISO] || []
    const incompleteTasks = tasks.filter(t => !t.completed && t.id !== taskId)
    if (incompleteTasks.length > 0) {
      setFocusedTaskId(incompleteTasks[0].id)
    } else {
      setFocusedTaskId(null)
    }
  }, [focusDateISO, tasksByDate])

  const handleFocusModeSkip = useCallback(() => {
    const tasks = tasksByDate[focusDateISO] || []
    const incompleteTasks = tasks.filter(t => !t.completed)
    const currentIndex = incompleteTasks.findIndex(t => t.id === focusedTaskId)
    if (currentIndex !== -1 && currentIndex < incompleteTasks.length - 1) {
      setFocusedTaskId(incompleteTasks[currentIndex + 1].id)
    } else if (incompleteTasks.length > 0) {
      setFocusedTaskId(incompleteTasks[0].id)
    }
  }, [focusDateISO, focusedTaskId, tasksByDate])

  const handleFocusModeExit = useCallback(() => {
    setFocusModeActive(false)
    setFocusedTaskId(null)
    setFocusDateISO("")
  }, [])

  const handleFocusSelectTask = useCallback((taskId: string) => {
    setFocusedTaskId(taskId)
  }, [])

  const focusTasks = useMemo(() => tasksByDate[focusDateISO] || [], [tasksByDate, focusDateISO])
  const focusCurrentTask = useMemo(() => focusTasks.find(t => t.id === focusedTaskId) || null, [focusTasks, focusedTaskId])
  const focusCompletedCount = useMemo(() => focusTasks.filter(t => t.completed).length, [focusTasks])
  const focusTotalCount = useMemo(() => focusTasks.length, [focusTasks])

  const todayISO = getTodayISO()
  const todayTasks = tasksByDate[todayISO] || []
  const todayIncompleteTasks = todayTasks.filter(t => !t.completed)

  const { weeklyPercent, completedCount, totalCount } = useMemo(() => {
    let totalCompleted = 0
    let totalTasks = 0
    for (const d of weekDates) {
      const iso = formatISODate(d)
      const tasks = tasksByDate[iso] || []
      totalCompleted += tasks.filter((t) => t.completed).length
      totalTasks += tasks.length
    }
    const pct = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100)
    return { weeklyPercent: pct, completedCount: totalCompleted, totalCount: totalTasks }
  }, [tasksByDate, weekDates])

  const availableTags = useMemo(() => getAllTags(tasksByDate), [tasksByDate])
  const searchResults = useMemo(() => {
    if (!hasActiveFilters(searchFilters)) return null
    const allTasks = flattenTasksByDate(tasksByDate)
    const filtered = filterTasks(allTasks, searchFilters)
    return { tasks: filtered, totalCount: allTasks.length, resultCount: filtered.length }
  }, [tasksByDate, searchFilters])

  const handleSearchFiltersChange = (filters: SearchFilters) => {
    setSearchFilters(filters)
    setShowSearchResults(hasActiveFilters(filters))
  }

  const handleQuickAddTask = async (task: { startTime: string; approxEndTime: string; description: string; priority?: "high" | "medium" | "low" | null; tags?: string[] }) => {
    const dateISO = formatISODate(selectedDate)
    const res = await fetch(`/api/tasks/${dateISO}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    if (!res.ok) {
      toast.error("Failed to create task")
      return
    }
    const created: Task = await res.json()
    setTasksByDate((prev) => {
      const list = [...(prev[dateISO] || []), created]
      list.sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
      return { ...prev, [dateISO]: list }
    })
    toast.success("Task created", {
      description: `"${task.description}" added to ${selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
    })
  }

  const handleImportComplete = useCallback(async () => {
    // Reload all data after import
    setIsLoading(true)
    try {
      const habitsRes = await fetch('/api/habits', { cache: 'no-store' })
      if (habitsRes.ok) {
        const habitsData = await habitsRes.json()
        setHabits(habitsData.habits || [])
      }
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
            if (!res.ok) return [iso, []] as const
            const data = await res.json()
            return [iso, (data.tasks || [])] as const
          } catch {
            return [iso, []] as const
          }
        }),
      )
      const categoriesEntries = await Promise.all(
        allDates.map(async (d) => {
          const iso = formatISODate(d)
          try {
            const res = await fetch(`/api/categories/${iso}`, { cache: 'no-store' })
            if (!res.ok) return [iso, {}] as const
            const data = await res.json()
            return [iso, data.categories] as const
          } catch {
            return [iso, {}] as const
          }
        }),
      )
      setTasksByDate(Object.fromEntries(tasksEntries))
      setCategoriesByDate(Object.fromEntries(categoriesEntries))
    } catch (error) {
      console.error('Error reloading data after import:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const goPrevWeek = () => setSelectedDate(addDays(weekStart, -7))
  const goNextWeek = () => setSelectedDate(addDays(weekStart, 7))
  const openWeekFor = (date: Date) => {
    setSelectedDate(date)
    setView("week")
    setTimeout(() => {
      const el = document.getElementById(`day-${formatISODate(date)}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 30)
  }
  const goToToday = () => {
    setSelectedDate(new Date())
    setView("week")
  }
  const toggleHabitByIndex = (index: number) => {
    if (index >= habits.length) return
    const habit = habits[index]
    const cats = categoriesByDate[todayISO] || {}
    const entry = cats[habit.id]
    const isCompleted = entry ? isHabitCompleted(entry) : false
    handleToggleCategory(todayISO, habit.id, !isCompleted)
  }
  const focusDateInput = () => {
    if (dateInputRef.current) {
      dateInputRef.current.focus()
      dateInputRef.current.showPicker?.()
    }
  }
  const scrollToTodayCard = () => {
    setSelectedDate(new Date())
    setView("week")
    setTimeout(() => {
      const el = document.getElementById(`day-${todayISO}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        const cardButton = el.querySelector('[role="button"]') as HTMLElement
        if (cardButton) cardButton.click()
      }
    }, 50)
  }

  const toggleDashboardView = useCallback(() => {
    const newMode = dashboardViewMode === 'standard' ? 'dashboard' : 'standard'
    setDashboardViewMode(newMode)
    saveViewMode(newMode)
  }, [dashboardViewMode])

  const shortcutHandlers: ShortcutHandler[] = useMemo(
    () => [
      { id: "go-today", keys: [{ key: "t" }], handler: goToToday },
      { id: "go-today-sequence", keys: [{ key: "g" }, { key: "t" }], handler: goToToday },
      { id: "prev-day", keys: [{ key: "j" }], handler: goPrevWeek },
      { id: "next-day", keys: [{ key: "k" }], handler: goNextWeek },
      { id: "prev-week-arrow", keys: [{ key: "ArrowLeft", modifiers: ["alt"] }], handler: goPrevWeek },
      { id: "next-week-arrow", keys: [{ key: "ArrowRight", modifiers: ["alt"] }], handler: goNextWeek },
      { id: "new-task", keys: [{ key: "n" }], handler: scrollToTodayCard },
      { id: "toggle-habit-1", keys: [{ key: "1" }], handler: () => toggleHabitByIndex(0) },
      { id: "toggle-habit-2", keys: [{ key: "2" }], handler: () => toggleHabitByIndex(1) },
      { id: "toggle-habit-3", keys: [{ key: "3" }], handler: () => toggleHabitByIndex(2) },
      { id: "toggle-habit-4", keys: [{ key: "4" }], handler: () => toggleHabitByIndex(3) },
      { id: "close-dialog", keys: [{ key: "Escape" }], handler: () => { setShortcutsHelpOpen(false); setCarryOverDialogOpen(false); setDuplicateDialogOpen(false) }, global: true },
      { id: "show-help", keys: [{ key: "?" }], handler: () => setShortcutsHelpOpen((prev) => !prev) },
      { id: "focus-search", keys: [{ key: "f" }], handler: focusDateInput },
      { id: "focus-search-slash", keys: [{ key: "/" }], handler: focusDateInput },
    ],
    [habits, categoriesByDate, weekStart]
  )

  useKeyboardShortcuts(shortcutHandlers)
  const currentYear = selectedDate.getFullYear()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {isLoading && !isInitialized && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">DF</div>
            <span className="text-lg font-semibold">Daily Flow</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={dashboardViewMode === 'dashboard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleDashboardView}
                  className="gap-2"
                >
                  {dashboardViewMode === 'dashboard' ? (
                    <>
                      <List className="h-4 w-4" />
                      <span className="hidden sm:inline">Standard</span>
                    </>
                  ) : (
                    <>
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden sm:inline">Dashboard</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Switch to {dashboardViewMode === 'dashboard' ? 'standard' : 'dashboard'} view</p>
              </TooltipContent>
            </Tooltip>
            <TaskStreakDialog tasksByDate={tasksByDate} usedFreezes={usedFreezes} onUseFreeze={handleUseFreeze}>
              <div className="cursor-pointer"><CompactTaskStreak tasksByDate={tasksByDate} usedFreezes={usedFreezes} /></div>
            </TaskStreakDialog>
            {todayIncompleteTasks.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => handleStartFocusMode(todayISO)} className="gap-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900">
                    <Target className="h-4 w-4" />
                    <span className="hidden sm:inline">Focus Mode</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Start focus mode with today&apos;s tasks ({todayIncompleteTasks.length} remaining)</p></TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goPrevWeek} aria-label="Previous week"><ChevronLeft className="h-5 w-5" /></Button></TooltipTrigger>
              <TooltipContent><p>Previous week <kbd className="ml-1 px-1 py-0.5 rounded bg-background/50 font-mono text-[10px]">J</kbd></p></TooltipContent>
            </Tooltip>
            <div className="hidden sm:flex items-center gap-2 rounded-lg border px-3 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{`${toLabelDate(weekDates[0])} - ${toLabelDate(weekDates[6])}`}</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={goNextWeek} aria-label="Next week"><ChevronRight className="h-5 w-5" /></Button></TooltipTrigger>
              <TooltipContent><p>Next week <kbd className="ml-1 px-1 py-0.5 rounded bg-background/50 font-mono text-[10px]">K</kbd></p></TooltipContent>
            </Tooltip>
            <label className="sr-only" htmlFor="date">Select date</label>
            <Input ref={dateInputRef} id="date" type="date" value={formatISODate(selectedDate)} onChange={(e) => { const v = e.target.value; if (v) setSelectedDate(new Date(v + "T00:00:00")) }} className="w-[9.5rem]" />
            <FlipClock />
            <QuickAddButton onClick={() => setQuickAddOpen(true)} />
            <CalendarExport tasksByDate={tasksByDate} />
            <DataExport tasksByDate={tasksByDate} categoriesByDate={categoriesByDate} habits={habits} />
            <DataImport onImportComplete={handleImportComplete} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setPrintDialogOpen(true)} aria-label="Print">
                  <Printer className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Print planner</p></TooltipContent>
            </Tooltip>
            <StatisticsDialog categoriesByDate={categoriesByDate} habits={habits} tasksByDate={tasksByDate} />
            <ReportsDialog tasksByDate={tasksByDate} categoriesByDate={categoriesByDate} habits={habits} />
            <BackupManager />
            <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
            <SettingsDialog weekStartsOn={weekStartsOn} onWeekStartsOnChange={handleWeekStartsOnChange} />
            <ThemePicker />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 space-y-3">
          <Card className="border-emerald-100">
            <CardContent className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <ProgressCircle percent={weeklyPercent} size={44} strokeWidth={6} />
                <div>
                  <div className="text-sm font-medium">Weekly progress</div>
                  <div className="text-xs text-muted-foreground">{`${completedCount}/${totalCount} tasks completed`}</div>
                </div>
              </div>
              <div className="hidden sm:block text-sm text-muted-foreground">Week of {toLabelDate(weekDates[0])}</div>
            </CardContent>
          </Card>
          {habits.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Habit Streaks</div>
              <CompactHabitStreaks habits={habits} categoriesByDate={categoriesByDate} />
            </div>
          )}
          {!carryOverDismissed && carryOverTasks.length > 0 && (
            <CarryOverBanner taskCount={carryOverTasks.length} onOpen={() => setCarryOverDialogOpen(true)} onDismiss={handleDismissCarryOver} />
          )}
          <SearchFilter filters={searchFilters} onFiltersChange={handleSearchFiltersChange} availableTags={availableTags} resultCount={searchResults?.resultCount} totalCount={searchResults?.totalCount} />
        </div>
      </header>
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-4">
          {dashboardViewMode === 'dashboard' && !showSearchResults ? (
            <Dashboard
              tasksByDate={tasksByDate}
              categoriesByDate={categoriesByDate}
              habits={habits}
              selectedDate={selectedDate}
              weekStartsOn={weekStartsOn}
              onToggleComplete={handleToggleComplete}
              onQuickAdd={() => setQuickAddOpen(true)}
              onSelectDate={setSelectedDate}
              onRefresh={handleImportComplete}
            />
          ) : showSearchResults && searchResults ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">Showing search results across all dates</div>
              {searchResults.tasks.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">No tasks match your search criteria</CardContent></Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(searchResults.tasks.reduce((acc, task) => { if (!acc[task.date]) acc[task.date] = []; acc[task.date].push(task); return acc }, {} as Record<string, TaskWithDate[]>))
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, tasks]) => {
                      const dateObj = new Date(date + 'T00:00:00')
                      const cats = categoriesByDate[date] || {}
                      const isToday = isSameDay(dateObj, new Date())
                      return (
                        <div key={date} id={`search-day-${date}`}>
                          <DayCard date={dateObj} tasks={tasks} categories={cats} habits={habits} dateISO={date} isToday={isToday} categoriesByDate={categoriesByDate}
                            onToggleComplete={(taskId, completed) => handleToggleComplete(date, taskId, completed)}
                            onAddTask={(t) => handleAddTask(date, t)}
                            onToggleCategory={(key, value) => handleToggleCategory(date, key, value)}
                            onIncrementHabit={(key) => handleIncrementHabit(date, key)}
                            onDecrementHabit={(key) => handleDecrementHabit(date, key)}
                            onUpdateEndTime={(taskId, newTime) => handleUpdateActualEndTime(date, taskId, newTime)}
                            onDeleteTask={(taskId) => handleDeleteTask(date, taskId)}
                            onToggleSubtask={(taskId, subtaskId, completed) => handleToggleSubtask(date, taskId, subtaskId, completed)}
                            onAddSubtask={(taskId, description) => handleAddSubtask(date, taskId, description)}
                            onDeleteSubtask={(taskId, subtaskId) => handleDeleteSubtask(date, taskId, subtaskId)}
                            onDuplicate={(task) => handleOpenDuplicateDialog(date, task)}
                            onFocusTask={(taskId) => handleStartFocusMode(date, taskId)}
                            onReorder={(taskIds) => handleReorder(date, taskIds)}
                            searchQuery={searchFilters.query} />
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          ) : (
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
                    const cats = categoriesByDate[iso] || {}
                    const isToday = isSameDay(date, new Date())
                    return (
                      <div key={iso} id={`day-${iso}`} className="scroll-mt-24">
                        <DayCard date={date} tasks={tasks} categories={cats} habits={habits} dateISO={iso} isToday={isToday} categoriesByDate={categoriesByDate}
                          onToggleComplete={(taskId, completed) => handleToggleComplete(iso, taskId, completed)}
                          onAddTask={(t) => handleAddTask(iso, t)}
                          onToggleCategory={(key, value) => handleToggleCategory(iso, key, value)}
                          onIncrementHabit={(key) => handleIncrementHabit(iso, key)}
                          onDecrementHabit={(key) => handleDecrementHabit(iso, key)}
                          onUpdateEndTime={(taskId, newTime) => handleUpdateActualEndTime(iso, taskId, newTime)}
                          onDeleteTask={(taskId) => handleDeleteTask(iso, taskId)}
                          onToggleSubtask={(taskId, subtaskId, completed) => handleToggleSubtask(iso, taskId, subtaskId, completed)}
                          onAddSubtask={(taskId, description) => handleAddSubtask(iso, taskId, description)}
                          onDeleteSubtask={(taskId, subtaskId) => handleDeleteSubtask(iso, taskId, subtaskId)}
                          onDuplicate={(task) => handleOpenDuplicateDialog(iso, task)}
                          onFocusTask={(taskId) => handleStartFocusMode(iso, taskId)}
                          onReorder={(taskIds) => handleReorder(iso, taskIds)} />
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
              <TabsContent value="month" className="mt-0">
                <CalendarHeatmap monthDate={selectedDate} tasksByDate={tasksByDate} categoriesByDate={categoriesByDate} filterMode={mode} onChangeFilter={setMode} selectedDate={selectedDate} onChangeMonth={(d) => setSelectedDate(d)} onSelectDate={(d) => setSelectedDate(d)} onOpenWeek={(d) => openWeekFor(d)} weekStartsOn={weekStartsOn} />
              </TabsContent>
              <TabsContent value="year" className="mt-0">
                <YearStrip year={currentYear} tasksByDate={tasksByDate} categoriesByDate={categoriesByDate} filterMode={mode} onChangeFilter={setMode} selectedDate={selectedDate} onChangeYear={(y) => setSelectedDate(new Date(y, selectedDate.getMonth(), selectedDate.getDate()))} onSelectDate={(d) => { setSelectedDate(d); setView("month") }} weekStartsOn={weekStartsOn} />
              </TabsContent>
            </Tabs>
          )}
        </section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">This UI is client-rendered to support local state, events, and interactivity.</footer>
      <CarryOverDialog open={carryOverDialogOpen} onOpenChange={setCarryOverDialogOpen} tasks={carryOverTasks} fromDate={getYesterdayISO()} toDate={getTodayISO()} onCarryOver={handleCarryOver} />
      <DuplicateTaskDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen} task={taskToDuplicate} sourceDate={duplicateSourceDate} onDuplicate={handleDuplicateTask} />
      <FocusMode isActive={focusModeActive} currentTask={focusCurrentTask} tasks={focusTasks} completedCount={focusCompletedCount} totalCount={focusTotalCount} onComplete={handleFocusModeComplete} onSkip={handleFocusModeSkip} onExit={handleFocusModeExit} onSelectTask={handleFocusSelectTask} />
      <QuickAddTask open={quickAddOpen} onOpenChange={setQuickAddOpen} onCreateTask={handleQuickAddTask} selectedDate={selectedDate} />
      <PrintDialog open={printDialogOpen} onOpenChange={setPrintDialogOpen} tasksByDate={tasksByDate} categoriesByDate={categoriesByDate} habits={habits} selectedDate={selectedDate} />
    </div>
  )
}
