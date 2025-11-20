"use client"

import { useMemo, useState } from "react"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import ProgressCircle from "@/components/progress-circle"
import type { TasksByDate } from "@/lib/types"
import {
  calculateEstimationAccuracy,
  getEstimationTrend,
  getAccuracyByTag,
  getAccuracyByPriority,
  suggestImprovement,
  getCommonEstimationErrors,
  formatDeltaTime,
  getStatusColor,
  getStatusBgColor,
  type ImprovementSuggestion,
  type AccuracyByCategory,
  type TaskEstimationData,
} from "@/lib/estimation-utils"
import { formatDurationHuman } from "@/lib/time-utils"
import { cn } from "@/lib/utils"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  Tag,
  Flag,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

type TimePeriod = 7 | 30 | 90 | 365

export default function EstimationAccuracy({
  tasksByDate,
  initialPeriod = 30,
}: {
  tasksByDate: TasksByDate
  initialPeriod?: TimePeriod
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(initialPeriod)

  // Filter tasks based on selected period
  const filteredTasksByDate = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - selectedPeriod)

    const filtered: TasksByDate = {}
    for (const [date, tasks] of Object.entries(tasksByDate)) {
      const taskDate = new Date(date)
      if (taskDate >= startDate && taskDate <= endDate) {
        filtered[date] = tasks
      }
    }
    return filtered
  }, [tasksByDate, selectedPeriod])

  const accuracy = useMemo(
    () => calculateEstimationAccuracy(filteredTasksByDate),
    [filteredTasksByDate]
  )

  const trend = useMemo(
    () => getEstimationTrend(filteredTasksByDate, selectedPeriod),
    [filteredTasksByDate, selectedPeriod]
  )

  const byTag = useMemo(
    () => getAccuracyByTag(filteredTasksByDate),
    [filteredTasksByDate]
  )

  const byPriority = useMemo(
    () => getAccuracyByPriority(filteredTasksByDate),
    [filteredTasksByDate]
  )

  const suggestions = useMemo(
    () => suggestImprovement(filteredTasksByDate),
    [filteredTasksByDate]
  )

  const errors = useMemo(
    () => getCommonEstimationErrors(filteredTasksByDate),
    [filteredTasksByDate]
  )

  if (accuracy.totalTasks === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">No estimation data available</p>
        <p className="text-sm mt-2">
          Complete some tasks with time estimates to see your accuracy analytics.
        </p>
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
              onClick={() => setSelectedPeriod(period)}
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

      {/* Main stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accuracy gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Estimation Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <ProgressCircle
                  percent={accuracy.overallAccuracy}
                  size={100}
                  strokeWidth={10}
                  progressColor={
                    accuracy.overallAccuracy >= 80
                      ? "#22c55e"
                      : accuracy.overallAccuracy >= 60
                      ? "#eab308"
                      : "#ef4444"
                  }
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <div className="flex-1 text-sm">Early</div>
                  <div className="font-medium">{accuracy.earlyTasks}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="flex-1 text-sm">On Time</div>
                  <div className="font-medium">{accuracy.onTimeTasks}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="flex-1 text-sm">Late</div>
                  <div className="font-medium">{accuracy.lateTasks}</div>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
              Based on {accuracy.totalTasks} completed tasks
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Average Deviation</div>
                <div className={cn(
                  "text-2xl font-bold",
                  accuracy.averageDelta > 0 ? "text-red-600" : accuracy.averageDelta < 0 ? "text-green-600" : "text-yellow-600"
                )}>
                  {formatDeltaTime(accuracy.averageDelta)}
                </div>
              </div>
              {accuracy.averageUnderestimate > 0 && (
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Underestimate</div>
                    <div className="font-medium text-red-600">
                      +{formatDurationHuman(accuracy.averageUnderestimate)}
                    </div>
                  </div>
                </div>
              )}
              {accuracy.averageOverestimate > 0 && (
                <div className="flex items-center gap-3">
                  <ArrowDownRight className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Overestimate</div>
                    <div className="font-medium text-green-600">
                      -{formatDurationHuman(accuracy.averageOverestimate)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart */}
      {trend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Trend</CardTitle>
            <CardDescription>Your estimation accuracy over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                accuracy: {
                  label: "Accuracy",
                  color: "#3b82f6",
                },
              }}
              className="h-[200px] w-full"
            >
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div>
                          <span className="font-medium">{value}%</span>
                          <span className="text-muted-foreground ml-2">
                            ({item.payload.taskCount} tasks)
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdown tabs */}
      <Tabs defaultValue="tags" className="w-full">
        <TabsList>
          <TabsTrigger value="tags" className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            By Tag
          </TabsTrigger>
          <TabsTrigger value="priority" className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            By Priority
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Common Errors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="mt-4">
          <AccuracyBreakdownList items={byTag} emptyMessage="No tagged tasks found" />
        </TabsContent>

        <TabsContent value="priority" className="mt-4">
          <AccuracyBreakdownList items={byPriority} emptyMessage="No priority data available" />
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ErrorsList
              title="Tasks Taking Longer"
              description="Tasks that exceeded their estimates"
              errors={errors.overruns}
              type="overrun"
            />
            <ErrorsList
              title="Tasks Finishing Early"
              description="Tasks completed before estimates"
              errors={errors.underruns}
              type="underrun"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Improvement suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <SuggestionItem key={index} suggestion={suggestion} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Component for accuracy breakdown list
function AccuracyBreakdownList({
  items,
  emptyMessage,
}: {
  items: AccuracyByCategory[]
  emptyMessage: string
}) {
  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.category}
          className="flex items-center gap-3 p-3 rounded-lg border"
        >
          <ProgressCircle
            percent={item.accuracy}
            size={44}
            strokeWidth={5}
            progressColor={
              item.accuracy >= 80
                ? "#22c55e"
                : item.accuracy >= 60
                ? "#eab308"
                : "#ef4444"
            }
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{item.category}</span>
              {item.trend === "improving" && (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              )}
              {item.trend === "declining" && (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              )}
              {item.trend === "stable" && (
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {item.taskCount} tasks | Avg: {formatDeltaTime(item.averageDelta)}
            </div>
          </div>
          <div
            className={cn(
              "text-lg font-bold",
              item.accuracy >= 80
                ? "text-green-600"
                : item.accuracy >= 60
                ? "text-yellow-600"
                : "text-red-600"
            )}
          >
            {item.accuracy}%
          </div>
        </div>
      ))}
    </div>
  )
}

// Component for errors list
function ErrorsList({
  title,
  description,
  errors,
  type,
}: {
  title: string
  description: string
  errors: TaskEstimationData[]
  type: "overrun" | "underrun"
}) {
  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4 text-sm">
            No {type === "overrun" ? "overruns" : "underruns"} found
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {errors.slice(0, 5).map((error, index) => (
            <div
              key={`${error.task.id}-${index}`}
              className={cn(
                "p-2 rounded text-sm",
                type === "overrun" ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"
              )}
            >
              <div className="font-medium truncate">{error.task.description}</div>
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>{new Date(error.date).toLocaleDateString()}</span>
                <span
                  className={cn(
                    "font-medium",
                    type === "overrun" ? "text-red-600" : "text-green-600"
                  )}
                >
                  {formatDeltaTime(error.delta)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Component for suggestion items
function SuggestionItem({ suggestion }: { suggestion: ImprovementSuggestion }) {
  const severityColors = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  }

  const typeIcons = {
    underestimate: <ArrowUpRight className="h-4 w-4 text-red-500" />,
    overestimate: <ArrowDownRight className="h-4 w-4 text-green-500" />,
    tag: <Tag className="h-4 w-4 text-purple-500" />,
    priority: <Flag className="h-4 w-4 text-blue-500" />,
    time_of_day: <Clock className="h-4 w-4 text-orange-500" />,
    general: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      {typeIcons[suggestion.type]}
      <div className="flex-1">
        <p className="text-sm">{suggestion.message}</p>
        {suggestion.category && (
          <Badge variant="outline" className="mt-2 text-xs">
            {suggestion.category}
          </Badge>
        )}
      </div>
      <Badge className={cn("text-xs", severityColors[suggestion.severity])}>
        {suggestion.severity}
      </Badge>
    </div>
  )
}

// Compact version for use in task cards
export function TaskAccuracyIndicator({
  estimatedDuration,
  actualDuration,
  delta,
  status,
}: {
  estimatedDuration: number
  actualDuration: number
  delta: number
  status: "early" | "on-time" | "late"
}) {
  const statusLabels = {
    early: "Early",
    "on-time": "On Time",
    late: "Late",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        getStatusBgColor(status),
        getStatusColor(status)
      )}
    >
      <span>{statusLabels[status]}</span>
      <span className="font-mono">{formatDeltaTime(delta)}</span>
    </div>
  )
}
