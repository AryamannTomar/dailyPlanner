"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { CategoriesByDate, HabitDefinition } from "@/lib/types"
import {
  calculateAllStreaks,
  getStreakColor,
  getStreakGlowColor,
  getStreakMessage,
  isStreakMilestone,
  getMilestoneMessage,
  type AllHabitStreaks,
  calculateHabitStreak,
} from "@/lib/streak-utils"
import { Flame, Trophy, Sparkles, Star } from "lucide-react"
import { IconLookup } from "@/components/habit-manager"

type StreakItemProps = {
  habit: HabitDefinition
  current: number
  longest: number
  compact?: boolean
}

function StreakItem({ habit, current, longest, compact = false }: StreakItemProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const isMilestone = isStreakMilestone(current)
  const milestoneMessage = getMilestoneMessage(current)
  const IconComponent = IconLookup[habit.icon] || Star

  useEffect(() => {
    if (isMilestone) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMilestone, current])

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all",
          current > 0 && "shadow-md",
          current > 0 && getStreakGlowColor(current)
        )}
      >
        <IconComponent className="h-4 w-4" style={{ color: habit.color }} />
        <div className="flex items-center gap-1">
          <Flame className={cn("h-3.5 w-3.5", getStreakColor(current))} />
          <span className={cn("text-sm font-semibold", getStreakColor(current))}>
            {current}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-xl border p-4 transition-all",
        current > 0 && "shadow-lg",
        current > 0 && getStreakGlowColor(current),
        showCelebration && "animate-pulse"
      )}
    >
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2 animate-bounce">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{milestoneMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <IconComponent className="h-4 w-4" style={{ color: habit.color }} />
        <span className="text-sm font-medium">{habit.name}</span>
      </div>

      {/* Streaks */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              "h-5 w-5 transition-all",
              getStreakColor(current),
              current > 0 && "animate-flicker"
            )}
          />
          <div>
            <div className={cn("text-xl font-bold", getStreakColor(current))}>
              {current}
            </div>
            <div className="text-[10px] text-muted-foreground">Current</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <div>
            <div className="text-xl font-bold text-amber-500">{longest}</div>
            <div className="text-[10px] text-muted-foreground">Best</div>
          </div>
        </div>
      </div>
    </div>
  )
}

type HabitStreaksProps = {
  habits: HabitDefinition[]
  categoriesByDate: CategoriesByDate
  compact?: boolean
}

export default function HabitStreaks({ habits, categoriesByDate, compact = false }: HabitStreaksProps) {
  const streaks = useMemo(
    () => calculateAllStreaks(habits, categoriesByDate),
    [habits, categoriesByDate]
  )

  // Calculate overall best streak and motivational message
  const { bestStreak, motivationalMessage } = useMemo(() => {
    const allCurrentStreaks = habits.map(h => streaks[h.id]?.current || 0)
    const best = allCurrentStreaks.length > 0 ? Math.max(...allCurrentStreaks) : 0
    return {
      bestStreak: best,
      motivationalMessage: getStreakMessage(best),
    }
  }, [habits, streaks])

  if (habits.length === 0) {
    return null
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {habits.map((habit) => (
          <StreakItem
            key={habit.id}
            habit={habit}
            current={streaks[habit.id]?.current || 0}
            longest={streaks[habit.id]?.longest || 0}
            compact
          />
        ))}
      </div>
    )
  }

  return (
    <Card className="border-amber-100 dark:border-amber-900/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Habit Streaks
          </CardTitle>
          {bestStreak > 0 && (
            <span className="text-xs text-muted-foreground">
              {motivationalMessage}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-3">
          {habits.map((habit) => (
            <StreakItem
              key={habit.id}
              habit={habit}
              current={streaks[habit.id]?.current || 0}
              longest={streaks[habit.id]?.longest || 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Export compact version for use in header
export function CompactHabitStreaks({
  habits,
  categoriesByDate
}: {
  habits: HabitDefinition[]
  categoriesByDate: CategoriesByDate
}) {
  return <HabitStreaks habits={habits} categoriesByDate={categoriesByDate} compact />
}
