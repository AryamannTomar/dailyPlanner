"use client"

import { useMemo } from "react"
import { formatISODate, getStartOfWeek, getWeekDates, addDays, startOfMonth, endOfMonth, toLabelDate, getDayLabel } from "@/lib/date-utils"
import type { Task, TasksByDate, CategoriesByDate, HabitDefinition, HabitEntry } from "@/lib/types"
import { isHabitCompleted, getHabitValue, getHabitGoal } from "@/lib/types"
import { cn } from "@/lib/utils"

export type PrintViewType = "daily" | "weekly" | "monthly"

export interface PrintViewProps {
  viewType: PrintViewType
  startDate: Date
  endDate: Date
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  includeCompleted: boolean
  includeNotes: boolean
  companyName?: string
  userName?: string
}

export function PrintView({
  viewType,
  startDate,
  endDate,
  tasksByDate,
  categoriesByDate,
  habits,
  includeCompleted,
  includeNotes,
  companyName,
  userName,
}: PrintViewProps) {
  const dates = useMemo(() => {
    const result: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      result.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [startDate, endDate])

  const filterTasks = (tasks: Task[]) => {
    if (includeCompleted) return tasks
    return tasks.filter(t => !t.completed)
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  return (
    <div className="print-view bg-white text-black p-8 min-h-full">
      {/* Header */}
      <div className="print-header mb-6 pb-4 border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Planner</h1>
            <p className="text-sm text-gray-600">
              {viewType === "daily" && toLabelDate(startDate)}
              {viewType === "weekly" && `Week of ${toLabelDate(startDate)} - ${toLabelDate(endDate)}`}
              {viewType === "monthly" && startDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            {companyName && <p className="font-semibold">{companyName}</p>}
            {userName && <p className="text-sm text-gray-600">{userName}</p>}
          </div>
        </div>
      </div>

      {/* Content based on view type */}
      {viewType === "daily" && (
        <DailyView
          date={startDate}
          tasks={filterTasks(tasksByDate[formatISODate(startDate)] || [])}
          categories={categoriesByDate[formatISODate(startDate)] || {}}
          habits={habits}
          includeNotes={includeNotes}
          formatTime={formatTime}
        />
      )}

      {viewType === "weekly" && (
        <WeeklyView
          dates={dates}
          tasksByDate={tasksByDate}
          categoriesByDate={categoriesByDate}
          habits={habits}
          includeNotes={includeNotes}
          filterTasks={filterTasks}
          formatTime={formatTime}
        />
      )}

      {viewType === "monthly" && (
        <MonthlyView
          dates={dates}
          tasksByDate={tasksByDate}
          categoriesByDate={categoriesByDate}
          habits={habits}
          includeNotes={includeNotes}
          filterTasks={filterTasks}
          formatTime={formatTime}
        />
      )}

      {/* Footer */}
      <div className="print-footer mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        Printed on {new Date().toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}
      </div>
    </div>
  )
}

interface DailyViewProps {
  date: Date
  tasks: Task[]
  categories: Record<string, HabitEntry>
  habits: HabitDefinition[]
  includeNotes: boolean
  formatTime: (time: string) => string
}

function DailyView({ date, tasks, categories, habits, includeNotes, formatTime }: DailyViewProps) {
  return (
    <div className="space-y-6">
      {/* Date Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">{getDayLabel(date)}</h2>
        <p className="text-gray-600">{toLabelDate(date)}</p>
      </div>

      {/* Time Slots / Tasks */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg border-b pb-1">Tasks</h3>
        {tasks.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No tasks scheduled</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="w-8 py-1"></th>
                <th className="text-left py-1 w-24">Time</th>
                <th className="text-left py-1">Task</th>
                {includeNotes && <th className="text-left py-1 w-1/4">Notes</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-gray-200">
                  <td className="py-2">
                    <div className={cn(
                      "w-4 h-4 border-2 border-black rounded-sm",
                      task.completed && "bg-gray-300"
                    )} />
                  </td>
                  <td className="py-2 text-xs">
                    <div>{formatTime(task.startTime)}</div>
                    <div className="text-gray-500">to {formatTime(task.approxEndTime)}</div>
                  </td>
                  <td className="py-2">
                    <div className={cn(
                      "font-medium",
                      task.completed && "line-through text-gray-500"
                    )}>
                      {task.description}
                    </div>
                    {task.priority && (
                      <span className={cn(
                        "text-xs px-1 py-0.5 rounded",
                        task.priority === "high" && "bg-red-100 text-red-700",
                        task.priority === "medium" && "bg-yellow-100 text-yellow-700",
                        task.priority === "low" && "bg-green-100 text-green-700"
                      )}>
                        {task.priority}
                      </span>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-1 ml-2 space-y-0.5">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-1 text-xs">
                            <div className={cn(
                              "w-2.5 h-2.5 border border-black rounded-sm",
                              subtask.completed && "bg-gray-300"
                            )} />
                            <span className={subtask.completed ? "line-through text-gray-500" : ""}>
                              {subtask.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {includeNotes && (
                    <td className="py-2 text-xs text-gray-600">
                      {task.notes || ""}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Habit Tracker */}
      {habits.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg border-b pb-1">Habit Tracker</h3>
          <div className="grid grid-cols-2 gap-2">
            {habits.map((habit) => {
              const entry = categories[habit.id]
              const completed = entry ? isHabitCompleted(entry) : false
              const value = entry ? getHabitValue(entry) : 0
              const goal = entry ? getHabitGoal(entry) : (habit.goal || 1)

              return (
                <div key={habit.id} className="flex items-center gap-2 p-2 border rounded">
                  <div className={cn(
                    "w-4 h-4 border-2 border-black rounded-sm flex-shrink-0",
                    completed && "bg-gray-300"
                  )} />
                  <span className="text-sm font-medium">{habit.name}</span>
                  {habit.goal && habit.goal > 1 && (
                    <span className="text-xs text-gray-500 ml-auto">
                      {value}/{goal}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes Section */}
      {includeNotes && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg border-b pb-1">Notes</h3>
          <div className="min-h-32 border rounded p-2">
            <div className="h-full" style={{
              backgroundImage: "repeating-linear-gradient(transparent, transparent 1.5rem, #e5e5e5 1.5rem, #e5e5e5 calc(1.5rem + 1px))",
              minHeight: "8rem"
            }} />
          </div>
        </div>
      )}
    </div>
  )
}

interface WeeklyViewProps {
  dates: Date[]
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  includeNotes: boolean
  filterTasks: (tasks: Task[]) => Task[]
  formatTime: (time: string) => string
}

function WeeklyView({ dates, tasksByDate, categoriesByDate, habits, includeNotes, filterTasks, formatTime }: WeeklyViewProps) {
  return (
    <div className="space-y-6">
      {dates.map((date, index) => {
        const dateISO = formatISODate(date)
        const tasks = filterTasks(tasksByDate[dateISO] || [])
        const categories = categoriesByDate[dateISO] || {}

        return (
          <div key={dateISO} className={cn(index > 0 && "page-break-before")}>
            <div className="mb-3 pb-2 border-b">
              <h3 className="font-bold text-lg">
                {getDayLabel(date)} - {toLabelDate(date)}
              </h3>
            </div>

            {/* Tasks for the day */}
            <div className="mb-4">
              {tasks.length === 0 ? (
                <p className="text-gray-500 italic text-sm">No tasks scheduled</p>
              ) : (
                <div className="space-y-1">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 py-1 border-b border-gray-100">
                      <div className={cn(
                        "w-3.5 h-3.5 border-2 border-black rounded-sm flex-shrink-0 mt-0.5",
                        task.completed && "bg-gray-300"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(task.startTime)}
                          </span>
                          <span className={cn(
                            "text-sm",
                            task.completed && "line-through text-gray-500"
                          )}>
                            {task.description}
                          </span>
                        </div>
                        {includeNotes && task.notes && (
                          <p className="text-xs text-gray-500 ml-12 mt-0.5">{task.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Habit tracker for the day */}
            {habits.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {habits.map((habit) => {
                  const entry = categories[habit.id]
                  const completed = entry ? isHabitCompleted(entry) : false
                  return (
                    <div key={habit.id} className="flex items-center gap-1">
                      <div className={cn(
                        "w-3 h-3 border border-black rounded-sm",
                        completed && "bg-gray-300"
                      )} />
                      <span>{habit.name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface MonthlyViewProps {
  dates: Date[]
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  includeNotes: boolean
  filterTasks: (tasks: Task[]) => Task[]
  formatTime: (time: string) => string
}

function MonthlyView({ dates, tasksByDate, categoriesByDate, habits, includeNotes, filterTasks, formatTime }: MonthlyViewProps) {
  // Group dates by week
  const weeks: Date[][] = []
  let currentWeek: Date[] = []

  dates.forEach((date, index) => {
    currentWeek.push(date)
    if (date.getDay() === 0 || index === dates.length - 1) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  return (
    <div className="space-y-4">
      {/* Month overview calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-xs mb-6">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="text-center font-bold p-1 bg-gray-100">
            {day}
          </div>
        ))}

        {/* Add empty cells for days before the first day of month */}
        {Array.from({ length: (dates[0].getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="p-1" />
        ))}

        {dates.map((date) => {
          const dateISO = formatISODate(date)
          const tasks = filterTasks(tasksByDate[dateISO] || [])
          const categories = categoriesByDate[dateISO] || {}
          const completedHabits = habits.filter(h => {
            const entry = categories[h.id]
            return entry && isHabitCompleted(entry)
          }).length

          return (
            <div key={dateISO} className="border p-1 min-h-16">
              <div className="font-bold text-xs">{date.getDate()}</div>
              {tasks.length > 0 && (
                <div className="text-xs text-gray-600">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</div>
              )}
              {completedHabits > 0 && (
                <div className="text-xs text-gray-600">{completedHabits}/{habits.length} habits</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Detailed task list by date */}
      <div className="page-break-before">
        <h3 className="font-bold text-lg border-b pb-2 mb-4">Task Details</h3>
        {dates.map((date) => {
          const dateISO = formatISODate(date)
          const tasks = filterTasks(tasksByDate[dateISO] || [])

          if (tasks.length === 0) return null

          return (
            <div key={dateISO} className="mb-4">
              <h4 className="font-semibold text-sm bg-gray-100 p-1">
                {getDayLabel(date)}, {toLabelDate(date)}
              </h4>
              <div className="space-y-0.5 mt-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-xs py-0.5">
                    <div className={cn(
                      "w-2.5 h-2.5 border border-black rounded-sm flex-shrink-0",
                      task.completed && "bg-gray-300"
                    )} />
                    <span className="text-gray-500">{formatTime(task.startTime)}</span>
                    <span className={task.completed ? "line-through text-gray-500" : ""}>
                      {task.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PrintView
