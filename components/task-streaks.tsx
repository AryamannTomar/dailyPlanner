"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TasksByDate } from "@/lib/types"
import {
  calculateTaskStreak,
  calculateProductivityStreak,
  getStreakHistory,
  getEarnedBadges,
  getTaskStreakColor,
  getTaskStreakGlowColor,
  getTaskStreakMessage,
  isStreakMilestone,
  getStreakMilestoneMessage,
  getMilestoneProgress,
  canUseFreeze,
  calculateStreakFreezeData,
  getTodayTaskStatus,
  type TaskStreakData,
  type StreakHistoryEntry,
  type StreakBadge,
  type StreakFreezeData,
  STREAK_BADGES,
} from "@/lib/task-streak-utils"
import {
  Flame,
  Trophy,
  Sparkles,
  Shield,
  Swords,
  Crown,
  Medal,
  Star,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Target,
  Zap,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Badge icon lookup
const BadgeIconLookup: Record<string, React.ElementType> = {
  shield: Shield,
  swords: Swords,
  crown: Crown,
  medal: Medal,
  star: Star,
  trophy: Trophy,
}

type TaskStreaksProps = {
  tasksByDate: TasksByDate
  usedFreezes?: string[]
  onUseFreeze?: () => void
  compact?: boolean
}

// Compact header streak indicator
export function CompactTaskStreak({
  tasksByDate,
  usedFreezes = [],
}: {
  tasksByDate: TasksByDate
  usedFreezes?: string[]
}) {
  const freezeData = useMemo(
    () => calculateStreakFreezeData(usedFreezes),
    [usedFreezes]
  )

  const streakData = useMemo(
    () => calculateTaskStreak(tasksByDate, freezeData),
    [tasksByDate, freezeData]
  )

  const todayStatus = useMemo(
    () => getTodayTaskStatus(tasksByDate),
    [tasksByDate]
  )

  const [showCelebration, setShowCelebration] = useState(false)
  const isMilestone = isStreakMilestone(streakData.current)

  useEffect(() => {
    if (isMilestone && streakData.current > 0) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMilestone, streakData.current])

  if (streakData.current === 0 && !streakData.atRisk) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-all cursor-pointer",
              streakData.current > 0 && "shadow-md",
              streakData.current > 0 && getTaskStreakGlowColor(streakData.current),
              streakData.atRisk && "border-amber-300 dark:border-amber-700",
              showCelebration && "animate-pulse"
            )}
          >
            <Flame
              className={cn(
                "h-4 w-4 transition-all",
                getTaskStreakColor(streakData.current),
                streakData.current > 0 && "animate-flicker"
              )}
            />
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                getTaskStreakColor(streakData.current)
              )}
            >
              {streakData.current}
            </span>
            {streakData.atRisk && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              Task Streak: {streakData.current} {streakData.current === 1 ? 'day' : 'days'}
            </div>
            <div className="text-xs text-muted-foreground">
              {getTaskStreakMessage(streakData.current)}
            </div>
            {streakData.atRisk && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Complete today's tasks to keep your streak!
              </div>
            )}
            {todayStatus.total > 0 && (
              <div className="text-xs">
                Today: {todayStatus.completed}/{todayStatus.total} tasks
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Calendar visualization for streak history
function StreakCalendar({ history }: { history: StreakHistoryEntry[] }) {
  // Group by weeks
  const weeks: StreakHistoryEntry[][] = []
  let currentWeek: StreakHistoryEntry[] = []

  // Pad start to align with week start
  const firstDate = new Date(history[0]?.date + 'T00:00:00')
  const firstDay = firstDate.getDay()
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({
      date: '',
      allCompleted: false,
      completedCount: 0,
      totalCount: 0,
      isStreakDay: false,
      isFreezeDay: false,
    })
  }

  history.forEach((entry) => {
    currentWeek.push(entry)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center">{day}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((entry, dayIndex) => {
              if (!entry.date) {
                return <div key={dayIndex} className="h-3 w-3" />
              }

              return (
                <TooltipProvider key={dayIndex}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-3 w-3 rounded-sm transition-colors",
                          entry.isFreezeDay && "bg-blue-200 dark:bg-blue-900",
                          entry.allCompleted && !entry.isFreezeDay && "bg-emerald-500",
                          entry.totalCount > 0 && !entry.allCompleted && !entry.isFreezeDay && "bg-amber-200 dark:bg-amber-900",
                          entry.totalCount === 0 && "bg-muted"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div>
                        {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      {entry.totalCount > 0 ? (
                        <div>
                          {entry.completedCount}/{entry.totalCount} tasks
                          {entry.allCompleted && " (all done!)"}
                        </div>
                      ) : (
                        <div>No tasks</div>
                      )}
                      {entry.isFreezeDay && (
                        <div className="text-blue-500">Freeze used</div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Badge display component
function BadgeDisplay({ badge }: { badge: StreakBadge }) {
  const IconComponent = BadgeIconLookup[badge.icon] || Star

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
              badge.earned
                ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800"
                : "bg-muted/30 border-muted opacity-50"
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                badge.earned
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <IconComponent className="h-4 w-4" />
            </div>
            <span className={cn(
              "text-[10px] font-medium text-center",
              badge.earned ? "text-foreground" : "text-muted-foreground"
            )}>
              {badge.requirement}d
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{badge.name}</div>
            <div className="text-xs text-muted-foreground">{badge.description}</div>
            {badge.earned ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Earned!
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {badge.requirement} day streak required
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Main TaskStreaks component
export default function TaskStreaks({
  tasksByDate,
  usedFreezes = [],
  onUseFreeze,
  compact = false,
}: TaskStreaksProps) {
  const freezeData = useMemo(
    () => calculateStreakFreezeData(usedFreezes),
    [usedFreezes]
  )

  const streakData = useMemo(
    () => calculateTaskStreak(tasksByDate, freezeData),
    [tasksByDate, freezeData]
  )

  const productivityStreak = useMemo(
    () => calculateProductivityStreak(tasksByDate, 3),
    [tasksByDate]
  )

  const history = useMemo(
    () => getStreakHistory(tasksByDate, freezeData, 42),
    [tasksByDate, freezeData]
  )

  const badges = useMemo(
    () => getEarnedBadges(tasksByDate, freezeData),
    [tasksByDate, freezeData]
  )

  const milestoneProgress = useMemo(
    () => getMilestoneProgress(streakData.current),
    [streakData.current]
  )

  const todayStatus = useMemo(
    () => getTodayTaskStatus(tasksByDate),
    [tasksByDate]
  )

  const [showCelebration, setShowCelebration] = useState(false)
  const isMilestone = isStreakMilestone(streakData.current)

  useEffect(() => {
    if (isMilestone && streakData.current > 0) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMilestone, streakData.current])

  const earnedBadgesCount = badges.filter((b) => b.earned).length

  if (compact) {
    return <CompactTaskStreak tasksByDate={tasksByDate} usedFreezes={usedFreezes} />
  }

  return (
    <Card className="border-orange-100 dark:border-orange-900/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Task Streaks
          </CardTitle>
          {streakData.current > 0 && (
            <span className="text-xs text-muted-foreground">
              {getTaskStreakMessage(streakData.current)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current and Longest Streak */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={cn(
              "relative flex flex-col gap-1 rounded-xl border p-3 transition-all",
              streakData.current > 0 && "shadow-lg",
              streakData.current > 0 && getTaskStreakGlowColor(streakData.current),
              showCelebration && "animate-pulse"
            )}
          >
            {showCelebration && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-1 animate-bounce">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-500">
                    {getStreakMilestoneMessage(streakData.current)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Flame
                className={cn(
                  "h-5 w-5 transition-all",
                  getTaskStreakColor(streakData.current),
                  streakData.current > 0 && "animate-flicker"
                )}
              />
              <div>
                <div className={cn("text-2xl font-bold", getTaskStreakColor(streakData.current))}>
                  {streakData.current}
                </div>
                <div className="text-[10px] text-muted-foreground">Current Streak</div>
              </div>
            </div>
            {streakData.atRisk && (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                At risk!
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold text-amber-500">{streakData.longest}</div>
                <div className="text-[10px] text-muted-foreground">Best Streak</div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Progress */}
        {todayStatus.total > 0 && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-muted-foreground" />
                Today's Progress
              </div>
              <span className="text-sm">
                {todayStatus.completed}/{todayStatus.total}
              </span>
            </div>
            <Progress
              value={(todayStatus.completed / todayStatus.total) * 100}
              className="h-2"
            />
            {todayStatus.allDone && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                All tasks completed!
              </div>
            )}
          </div>
        )}

        {/* Milestone Progress */}
        {milestoneProgress.nextMilestone && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Next Milestone
              </div>
              <span className="text-sm font-medium">
                {milestoneProgress.nextMilestone} days
              </span>
            </div>
            <Progress value={milestoneProgress.progress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {milestoneProgress.daysRemaining} days to go
            </div>
          </div>
        )}

        {/* Streak Calendar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Last 6 Weeks
          </div>
          <StreakCalendar history={history} />
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-emerald-500" />
              All done
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-amber-200 dark:bg-amber-900" />
              Partial
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-blue-200 dark:bg-blue-900" />
              Freeze
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className="h-4 w-4 text-muted-foreground" />
              Badges
            </div>
            <span className="text-xs text-muted-foreground">
              {earnedBadgesCount}/{badges.length} earned
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {badges.map((badge) => (
              <BadgeDisplay key={badge.id} badge={badge} />
            ))}
          </div>
        </div>

        {/* Streak Freeze */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Snowflake className="h-4 w-4 text-blue-500" />
              Streak Freezes
            </div>
            <Badge variant="secondary" className="text-xs">
              {freezeData.available}/{freezeData.maxPerMonth} available
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Use a freeze to skip one day without breaking your streak. {freezeData.maxPerMonth} freezes available per month.
          </p>
          {onUseFreeze && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUseFreeze}
              disabled={!canUseFreeze(freezeData) || todayStatus.allDone}
              className="w-full"
            >
              <Snowflake className="h-3 w-3 mr-1" />
              Use Freeze Today
            </Button>
          )}
        </div>

        {/* Productivity Streak (secondary) */}
        {productivityStreak.current > 0 && (
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">Productivity Streak</div>
              <div className="text-xs">
                <span className="font-bold">{productivityStreak.current}</span>
                <span className="text-muted-foreground"> days (3+ tasks)</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Dialog wrapper for showing full streak details
export function TaskStreakDialog({
  tasksByDate,
  usedFreezes = [],
  onUseFreeze,
  children,
}: {
  tasksByDate: TasksByDate
  usedFreezes?: string[]
  onUseFreeze?: () => void
  children: React.ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Task Streak Details
          </DialogTitle>
          <DialogDescription>
            Track your task completion streaks and earn badges
          </DialogDescription>
        </DialogHeader>
        <TaskStreaks
          tasksByDate={tasksByDate}
          usedFreezes={usedFreezes}
          onUseFreeze={onUseFreeze}
        />
      </DialogContent>
    </Dialog>
  )
}

// Export for use in header
export { CompactTaskStreak }
