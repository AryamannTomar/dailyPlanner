"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Flame,
  RefreshCw,
  Minus,
  Maximize2,
} from "lucide-react"
import type { HabitDefinition, CategoriesByDate, HabitEntry } from "@/lib/types"
import { isHabitCompleted, getHabitCompletionPercent } from "@/lib/types"
import { calculateStreak } from "@/lib/streak-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface HabitStreakWidgetProps {
  habits: HabitDefinition[]
  categoriesByDate: CategoriesByDate
  size: WidgetSize
  minimized: boolean
  onRefresh: () => void
  onMinimize: () => void
}

export function HabitStreakWidget({
  habits,
  categoriesByDate,
  size,
  minimized,
  onRefresh,
  onMinimize,
}: HabitStreakWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Calculate streaks for each habit
  const habitStreaks = habits.map(habit => {
    const streak = calculateStreak(habit.id, categoriesByDate)
    return {
      habit,
      streak,
    }
  })

  // Get total active streaks
  const activeStreaks = habitStreaks.filter(h => h.streak > 0).length

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Streaks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{activeStreaks} active</span>
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
            <Flame className="h-4 w-4 text-orange-500" />
            Habit Streaks
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
        {habits.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No habits configured
          </div>
        ) : (
          <div className="space-y-3">
            {habitStreaks.map(({ habit, streak }) => (
              <div key={habit.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{habit.icon}</span>
                    <span className="text-sm font-medium truncate">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">{streak}</span>
                    {streak > 0 && <Flame className="h-3 w-3 text-orange-500" />}
                  </div>
                </div>
                <Progress
                  value={Math.min(streak * 10, 100)}
                  className="h-1.5"
                  style={{
                    ['--progress-background' as string]: habit.color
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
