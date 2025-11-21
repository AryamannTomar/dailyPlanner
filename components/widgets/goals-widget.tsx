"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Target,
  RefreshCw,
  Minus,
  Maximize2,
  CheckSquare,
  Clock,
  Timer,
} from "lucide-react"
import type { TasksByDate, DailyGoal, DailyGoalsConfig } from "@/lib/types"
import { DEFAULT_DAILY_GOALS, getGoalCompletionPercent, isGoalCompleted } from "@/lib/types"
import { formatISODate } from "@/lib/date-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface GoalsWidgetProps {
  tasksByDate: TasksByDate
  todayISO: string
  size: WidgetSize
  minimized: boolean
  onRefresh: () => void
  onMinimize: () => void
}

const GOALS_STORAGE_KEY = 'dailyPlanner_dailyGoals'

export function GoalsWidget({
  tasksByDate,
  todayISO,
  size,
  minimized,
  onRefresh,
  onMinimize,
}: GoalsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [goals, setGoals] = useState<DailyGoal[]>(DEFAULT_DAILY_GOALS)

  useEffect(() => {
    // Load goals from localStorage
    try {
      const saved = localStorage.getItem(GOALS_STORAGE_KEY)
      if (saved) {
        const config: DailyGoalsConfig = JSON.parse(saved)
        // Reset if it's a new day
        if (config.lastResetDate !== todayISO) {
          const resetGoals = config.goals.map(g => ({ ...g, current: 0 }))
          setGoals(resetGoals)
          localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify({
            goals: resetGoals,
            lastResetDate: todayISO
          }))
        } else {
          setGoals(config.goals)
        }
      }
    } catch (error) {
      console.error('Failed to load goals:', error)
    }
  }, [todayISO])

  // Update task goal based on actual tasks
  useEffect(() => {
    const todayTasks = tasksByDate[todayISO] || []
    const completedTasks = todayTasks.filter(t => t.completed).length

    setGoals(prev => {
      const updated = prev.map(goal => {
        if (goal.type === 'tasks') {
          return { ...goal, current: completedTasks }
        }
        return goal
      })

      // Save to localStorage
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify({
        goals: updated,
        lastResetDate: todayISO
      }))

      return updated
    })
  }, [tasksByDate, todayISO])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const enabledGoals = goals.filter(g => g.enabled)
  const completedGoals = enabledGoals.filter(g => isGoalCompleted(g)).length

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'tasks': return <CheckSquare className="h-4 w-4" />
      case 'hours': return <Clock className="h-4 w-4" />
      case 'pomodoros': return <Timer className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const formatGoalValue = (goal: DailyGoal) => {
    if (goal.type === 'hours') {
      const hours = (goal.current / 3600).toFixed(1)
      return `${hours}/${goal.target}h`
    }
    return `${goal.current}/${goal.target}`
  }

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Goals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{completedGoals}/{enabledGoals.length}</span>
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
            <Target className="h-4 w-4 text-purple-500" />
            Daily Goals
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
        {enabledGoals.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No goals configured
          </div>
        ) : (
          <div className="space-y-4">
            {enabledGoals.map(goal => {
              const percent = getGoalCompletionPercent(goal)
              const completed = isGoalCompleted(goal)

              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {getGoalIcon(goal.type)}
                      <span className="text-sm capitalize">{goal.type}</span>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      completed && "text-emerald-600"
                    )}>
                      {formatGoalValue(goal)}
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    className={cn(
                      "h-2",
                      completed && "[&>div]:bg-emerald-500"
                    )}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
