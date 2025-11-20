"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import ProgressCircle from "@/components/progress-circle"
import type { CategoriesByDate, HabitDefinition } from "@/lib/types"
import { getAllHabitStats, type HabitStats } from "@/lib/habit-stats"
import { cn } from "@/lib/utils"
import { TrendingUp, Calendar, Star, Flame } from "lucide-react"
import { IconLookup } from "@/components/habit-manager"

type TimePeriod = 7 | 30 | 90 | 365

export default function HabitStatistics({
  categoriesByDate,
  habits,
  initialPeriod = 30,
  onPeriodChange,
}: {
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  initialPeriod?: TimePeriod
  onPeriodChange?: (period: TimePeriod) => void
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod)
  const [selectedHabitId, setSelectedHabitId] = useState<string>(habits[0]?.id || "")

  const allStats = useMemo(
    () => getAllHabitStats(categoriesByDate, habits, selectedPeriod),
    [categoriesByDate, habits, selectedPeriod]
  )

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  const selectedHabit = habits.find((h) => h.id === selectedHabitId) || habits[0]

  if (habits.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No habits configured. Add some habits to see statistics.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Time period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        <div className="flex gap-1">
          {([7, 30, 90, 365] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                selectedPeriod === period
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {period === 365 ? "All" : `${period}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Habit tabs */}
      <Tabs value={selectedHabitId} onValueChange={setSelectedHabitId}>
        <TabsList className="w-full justify-start flex-wrap h-auto">
          {habits.map((habit) => {
            const Icon = IconLookup[habit.icon] || Star
            return (
              <TabsTrigger
                key={habit.id}
                value={habit.id}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{habit.name}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {habits.map((habit) => (
          <TabsContent key={habit.id} value={habit.id} className="mt-4">
            <HabitStatsCard
              stats={allStats[habit.id]}
              habit={habit}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        {habits.map((habit) => {
          const stats = allStats[habit.id]
          const Icon = IconLookup[habit.icon] || Star
          return (
            <Card
              key={habit.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedHabitId === habit.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedHabitId(habit.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-6 w-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${habit.color}20` }}
                  >
                    <Icon
                      className="h-3.5 w-3.5"
                      style={{ color: habit.color }}
                    />
                  </div>
                  <span className="text-xs font-medium">{habit.name}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: habit.color }}>
                  {stats?.completionRate || 0}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {stats?.weeklyCompletion.completed || 0}/{stats?.weeklyCompletion.total || 0} this week
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function HabitStatsCard({
  stats,
  habit
}: {
  stats: HabitStats
  habit: HabitDefinition
}) {
  const Icon = IconLookup[habit.icon] || Star
  const color = habit.color

  const chartConfig = {
    completed: {
      label: "Completed",
      color: color,
    },
  }

  // Prepare data for weekly trend bar chart
  const weeklyData = stats.weeklyTrend.map((item) => ({
    ...item,
    fill: item.completed ? color : "#e5e7eb",
  }))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Main stats card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color }} />
            {habit.name} Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Progress ring */}
            <div className="relative">
              <ProgressCircle
                percent={stats.completionRate}
                size={80}
                strokeWidth={8}
                progressColor={color}
              />
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Weekly</div>
                  <div className="text-sm font-medium">
                    {stats.weeklyCompletion.completed}/{stats.weeklyCompletion.total} ({stats.weeklyCompletion.rate}%)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Monthly</div>
                  <div className="text-sm font-medium">
                    {stats.monthlyCompletion.completed}/{stats.monthlyCompletion.total} ({stats.monthlyCompletion.rate}%)
                  </div>
                </div>
              </div>

              {stats.bestDay && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Best Day</div>
                    <div className="text-sm font-medium">
                      {stats.bestDay.day} ({stats.bestDay.rate}%)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streaks */}
          <div className="mt-4 pt-4 border-t flex gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-xs text-muted-foreground">Current Streak</div>
                <div className="text-lg font-bold">{stats.streakCurrent} days</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Longest Streak</div>
                <div className="text-lg font-bold">{stats.streakLongest} days</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                ticks={[0, 1]}
                tickFormatter={(value) => (value === 1 ? "Yes" : "No")}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span>{value === 1 ? "Completed" : "Not completed"}</span>
                    )}
                  />
                }
              />
              <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                {weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// Compact version for use in dialogs or sidebars
export function HabitStatsCompact({
  habit,
  stats,
}: {
  habit: HabitDefinition
  stats: HabitStats
}) {
  const Icon = IconLookup[habit.icon] || Star
  const color = habit.color

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div
        className="h-8 w-8 rounded-md flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{habit.name}</div>
        <div className="text-xs text-muted-foreground">
          {stats.weeklyCompletion.completed}/{stats.weeklyCompletion.total} this week
        </div>
      </div>
      <ProgressCircle
        percent={stats.completionRate}
        size={40}
        strokeWidth={5}
        progressColor={color}
      />
    </div>
  )
}
