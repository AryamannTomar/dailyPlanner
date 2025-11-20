"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckSquare, Clock, Timer, Settings, Trophy, Sparkles, TrendingUp, Flame } from "lucide-react"
import type { DailyGoal, GoalType, Task } from "@/lib/types"
import { getGoalLabel, formatGoalProgress, isGoalCompleted, getGoalCompletionPercent } from "@/lib/types"
import { cn } from "@/lib/utils"

interface DailyGoalsProps {
  tasks: Task[]
  onGoalsUpdate?: (goals: DailyGoal[]) => void
  className?: string
  compact?: boolean
}

// Get icon component for goal type
function GoalIcon({ type, className }: { type: GoalType; className?: string }) {
  switch (type) {
    case 'tasks':
      return <CheckSquare className={className} />
    case 'hours':
      return <Clock className={className} />
    case 'pomodoros':
      return <Timer className={className} />
  }
}

// Get color for goal type
function getGoalColor(type: GoalType): string {
  switch (type) {
    case 'tasks':
      return 'bg-emerald-500'
    case 'hours':
      return 'bg-blue-500'
    case 'pomodoros':
      return 'bg-orange-500'
  }
}

// Get motivational message based on progress
function getMotivationalMessage(goals: DailyGoal[]): string {
  const enabledGoals = goals.filter(g => g.enabled)
  if (enabledGoals.length === 0) return "Set some goals to get started!"

  const completedCount = enabledGoals.filter(g => isGoalCompleted(g)).length
  const avgProgress = enabledGoals.reduce((sum, g) => sum + getGoalCompletionPercent(g), 0) / enabledGoals.length

  if (completedCount === enabledGoals.length) {
    return "Amazing! All goals completed!"
  } else if (avgProgress >= 75) {
    return "Almost there! Keep pushing!"
  } else if (avgProgress >= 50) {
    return "Great progress! You're halfway there!"
  } else if (avgProgress >= 25) {
    return "Good start! Keep the momentum going!"
  } else if (avgProgress > 0) {
    return "You've started! Every step counts!"
  } else {
    return "Ready to crush your goals today?"
  }
}

export default function DailyGoals({ tasks, onGoalsUpdate, className, compact = false }: DailyGoalsProps) {
  const [goals, setGoals] = useState<DailyGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [celebrationGoalId, setCelebrationGoalId] = useState<string | null>(null)

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals()
  }, [])

  // Calculate progress when tasks change
  useEffect(() => {
    if (goals.length > 0) {
      calculateProgress()
    }
  }, [tasks])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateProgress = () => {
    // Calculate progress locally from tasks
    const updatedGoals = goals.map(goal => {
      let current = 0

      switch (goal.type) {
        case 'tasks':
          current = tasks.filter(t => t.completed).length
          break
        case 'hours':
          current = tasks
            .filter(t => t.completed && t.durationSeconds)
            .reduce((sum, t) => sum + (t.durationSeconds || 0), 0)
          break
        case 'pomodoros':
          // Keep existing pomodoro count (tracked separately)
          current = goal.current
          break
      }

      // Check if goal was just completed
      const wasCompleted = isGoalCompleted(goal)
      const newGoal = { ...goal, current }
      const nowCompleted = isGoalCompleted(newGoal)

      if (!wasCompleted && nowCompleted) {
        // Trigger celebration
        setCelebrationGoalId(goal.id)
        setTimeout(() => setCelebrationGoalId(null), 3000)
      }

      return newGoal
    })

    setGoals(updatedGoals)
    onGoalsUpdate?.(updatedGoals)
  }

  const handleGoalSettingChange = async (goalId: string, updates: { target?: number; enabled?: boolean }) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, ...updates }),
      })

      if (res.ok) {
        setGoals(prev =>
          prev.map(g =>
            g.id === goalId ? { ...g, ...updates } : g
          )
        )
      }
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const enabledGoals = goals.filter(g => g.enabled)
    if (enabledGoals.length === 0) return 0
    return Math.round(
      enabledGoals.reduce((sum, g) => sum + getGoalCompletionPercent(g), 0) / enabledGoals.length
    )
  }, [goals])

  const allGoalsCompleted = useMemo(() => {
    const enabledGoals = goals.filter(g => g.enabled)
    return enabledGoals.length > 0 && enabledGoals.every(g => isGoalCompleted(g))
  }, [goals])

  const enabledGoals = goals.filter(g => g.enabled)

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="p-4">
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-2 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <CompactGoalsWidget
        goals={enabledGoals}
        overallProgress={overallProgress}
        allCompleted={allGoalsCompleted}
        onSettingsClick={() => setSettingsOpen(true)}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        onGoalSettingChange={handleGoalSettingChange}
        allGoals={goals}
      />
    )
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Celebration overlay */}
      {allGoalsCompleted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 right-2">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Daily Goals
          </CardTitle>
          <GoalSettingsDialog
            goals={goals}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            onGoalSettingChange={handleGoalSettingChange}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Overall progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Individual goals */}
        <div className="space-y-2">
          {enabledGoals.map(goal => (
            <GoalProgressItem
              key={goal.id}
              goal={goal}
              isCelebrating={celebrationGoalId === goal.id}
            />
          ))}
        </div>

        {/* Motivational message */}
        <div className="text-xs text-center text-muted-foreground pt-1">
          {allGoalsCompleted ? (
            <span className="flex items-center justify-center gap-1 text-yellow-600 font-medium">
              <Trophy className="h-3 w-3" />
              {getMotivationalMessage(goals)}
            </span>
          ) : (
            getMotivationalMessage(goals)
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Individual goal progress item
function GoalProgressItem({ goal, isCelebrating }: { goal: DailyGoal; isCelebrating: boolean }) {
  const percent = getGoalCompletionPercent(goal)
  const completed = isGoalCompleted(goal)

  return (
    <div className={cn(
      "space-y-1 transition-all",
      isCelebrating && "animate-pulse"
    )}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <GoalIcon type={goal.type} className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{getGoalLabel(goal.type)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "font-medium",
            completed && "text-emerald-600"
          )}>
            {formatGoalProgress(goal.type, goal.current, goal.target)}
          </span>
          {completed && <CheckSquare className="h-3 w-3 text-emerald-600" />}
        </div>
      </div>
      <div className="relative">
        <Progress
          value={percent}
          className={cn(
            "h-1.5",
            completed && "[&>div]:bg-emerald-500"
          )}
        />
        {isCelebrating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-yellow-500 animate-bounce" />
          </div>
        )}
      </div>
    </div>
  )
}

// Compact goals widget for header
function CompactGoalsWidget({
  goals,
  overallProgress,
  allCompleted,
  onSettingsClick,
  settingsOpen,
  onSettingsOpenChange,
  onGoalSettingChange,
  allGoals,
}: {
  goals: DailyGoal[]
  overallProgress: number
  allCompleted: boolean
  onSettingsClick: () => void
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  onGoalSettingChange: (goalId: string, updates: { target?: number; enabled?: boolean }) => void
  allGoals: DailyGoal[]
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            allCompleted && "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
          )}
        >
          {allCompleted ? (
            <Trophy className="h-4 w-4 text-yellow-500" />
          ) : (
            <Flame className="h-4 w-4 text-orange-500" />
          )}
          <span className="hidden sm:inline">Goals</span>
          <span className="font-medium">{overallProgress}%</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Today&apos;s Goals</span>
            <GoalSettingsDialog
              goals={allGoals}
              open={settingsOpen}
              onOpenChange={onSettingsOpenChange}
              onGoalSettingChange={onGoalSettingChange}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        <div className="p-3 space-y-2">
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No goals enabled. Click settings to configure.
            </p>
          ) : (
            goals.map(goal => (
              <GoalProgressItem key={goal.id} goal={goal} isCelebrating={false} />
            ))
          )}
        </div>

        <div className="p-3 pt-0 text-xs text-center text-muted-foreground">
          {getMotivationalMessage(goals)}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Goal settings dialog
function GoalSettingsDialog({
  goals,
  open,
  onOpenChange,
  onGoalSettingChange,
}: {
  goals: DailyGoal[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onGoalSettingChange: (goalId: string, updates: { target?: number; enabled?: boolean }) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Settings className="h-3.5 w-3.5" />
          <span className="sr-only">Goal settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily Goal Settings</DialogTitle>
          <DialogDescription>
            Configure your daily goals and targets. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {goals.map(goal => (
            <div key={goal.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Switch
                  id={`goal-${goal.id}-enabled`}
                  checked={goal.enabled}
                  onCheckedChange={(enabled) => onGoalSettingChange(goal.id, { enabled })}
                />
                <div className="flex items-center gap-2 flex-1">
                  <GoalIcon type={goal.type} className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`goal-${goal.id}-enabled`} className="flex-1">
                    {getGoalLabel(goal.type)}
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`goal-${goal.id}-target`} className="sr-only">
                  Target
                </Label>
                <Input
                  id={`goal-${goal.id}-target`}
                  type="number"
                  min={1}
                  max={goal.type === 'hours' ? 24 : 100}
                  value={goal.target}
                  onChange={(e) => {
                    const target = parseInt(e.target.value, 10)
                    if (!isNaN(target) && target > 0) {
                      onGoalSettingChange(goal.id, { target })
                    }
                  }}
                  className="w-16 h-8 text-center"
                  disabled={!goal.enabled}
                />
                <span className="text-xs text-muted-foreground w-8">
                  {goal.type === 'hours' ? 'hrs' : goal.type === 'pomodoros' ? 'pom' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          <p><strong>Tasks:</strong> Completed tasks for the day</p>
          <p><strong>Hours:</strong> Total work time from completed tasks</p>
          <p><strong>Pomodoros:</strong> Completed focus sessions</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Export a standalone settings component for use elsewhere
export function DailyGoalSettings({
  className,
}: {
  className?: string
}) {
  const [goals, setGoals] = useState<DailyGoal[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    }
  }

  const handleGoalSettingChange = async (goalId: string, updates: { target?: number; enabled?: boolean }) => {
    try {
      const res = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, ...updates }),
      })

      if (res.ok) {
        setGoals(prev =>
          prev.map(g =>
            g.id === goalId ? { ...g, ...updates } : g
          )
        )
      }
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  return (
    <div className={className}>
      <GoalSettingsDialog
        goals={goals}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onGoalSettingChange={handleGoalSettingChange}
      />
    </div>
  )
}
