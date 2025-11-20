"use client"

import { useState, useMemo, useRef } from "react"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  CheckCircle2,
  Target,
  Flame,
  Download,
  Share2,
  Copy,
  Award,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import type { TasksByDate, CategoriesByDate, HabitDefinition } from "@/lib/types"
import {
  generateWeeklyReport,
  generateMonthlyReport,
  generateComparison,
  formatTimeWorked,
  getPreviousWeekStart,
  getPreviousMonth,
  generateReportSummary,
  getTasksChartData,
  getCompletionRateChartData,
  getTimeWorkedChartData,
  type WeeklyReport,
  type MonthlyReport,
  type ReportComparison,
  type ComparisonData,
} from "@/lib/report-utils"
import { getStartOfWeek, addDays, formatISODate, startOfMonth } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ReportType = "weekly" | "monthly"

export default function ReportsDialog({
  tasksByDate,
  categoriesByDate,
  habits,
}: {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Reports</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reports
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="px-6 pb-6">
            <ReportsContent
              tasksByDate={tasksByDate}
              categoriesByDate={categoriesByDate}
              habits={habits}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function ReportsContent({
  tasksByDate,
  categoriesByDate,
  habits,
}: {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
}) {
  const [reportType, setReportType] = useState<ReportType>("weekly")
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getStartOfWeek(new Date()))
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [showComparison, setShowComparison] = useState(true)
  const reportRef = useRef<HTMLDivElement>(null)

  // Generate reports
  const weeklyReport = useMemo(
    () => generateWeeklyReport(tasksByDate, categoriesByDate, selectedWeekStart, habits),
    [tasksByDate, categoriesByDate, selectedWeekStart, habits]
  )

  const previousWeekReport = useMemo(
    () => generateWeeklyReport(tasksByDate, categoriesByDate, getPreviousWeekStart(selectedWeekStart), habits),
    [tasksByDate, categoriesByDate, selectedWeekStart, habits]
  )

  const monthlyReport = useMemo(
    () => generateMonthlyReport(tasksByDate, categoriesByDate, selectedMonth, habits),
    [tasksByDate, categoriesByDate, selectedMonth, habits]
  )

  const previousMonthReport = useMemo(
    () => generateMonthlyReport(tasksByDate, categoriesByDate, getPreviousMonth(selectedMonth), habits),
    [tasksByDate, categoriesByDate, selectedMonth, habits]
  )

  const weeklyComparison = useMemo(
    () => generateComparison(weeklyReport, previousWeekReport),
    [weeklyReport, previousWeekReport]
  )

  const monthlyComparison = useMemo(
    () => generateComparison(monthlyReport, previousMonthReport),
    [monthlyReport, previousMonthReport]
  )

  const currentReport = reportType === "weekly" ? weeklyReport : monthlyReport
  const comparison = reportType === "weekly" ? weeklyComparison : monthlyComparison

  // Navigation handlers
  const goToPrevious = () => {
    if (reportType === "weekly") {
      setSelectedWeekStart(getPreviousWeekStart(selectedWeekStart))
    } else {
      setSelectedMonth(getPreviousMonth(selectedMonth))
    }
  }

  const goToNext = () => {
    if (reportType === "weekly") {
      setSelectedWeekStart(addDays(selectedWeekStart, 7))
    } else {
      const next = new Date(selectedMonth)
      next.setMonth(next.getMonth() + 1)
      setSelectedMonth(next)
    }
  }

  const goToCurrentPeriod = () => {
    if (reportType === "weekly") {
      setSelectedWeekStart(getStartOfWeek(new Date()))
    } else {
      setSelectedMonth(startOfMonth(new Date()))
    }
  }

  // Export handlers
  const handleCopyToClipboard = async () => {
    const summary = generateReportSummary(currentReport, reportType)
    try {
      await navigator.clipboard.writeText(summary)
      toast.success("Report copied to clipboard")
    } catch {
      toast.error("Failed to copy report")
    }
  }

  const handleShare = async () => {
    const summary = generateReportSummary(currentReport, reportType)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daily Flow ${reportType === "weekly" ? "Weekly" : "Monthly"} Report`,
          text: summary,
        })
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          toast.error("Failed to share report")
        }
      }
    } else {
      handleCopyToClipboard()
    }
  }

  const handleExport = () => {
    const summary = generateReportSummary(currentReport, reportType)
    const blob = new Blob([summary], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `daily-flow-${reportType}-report-${formatISODate(new Date())}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Report exported")
  }

  // Period label
  const periodLabel = reportType === "weekly"
    ? `${new Date(weeklyReport.weekStart + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${new Date(weeklyReport.weekEnd + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : `${monthlyReport.monthName} ${monthlyReport.year}`

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Report type tabs and navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentPeriod} className="min-w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            {periodLabel}
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy to clipboard</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share report</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download report</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Tasks Completed"
          value={currentReport.totalTasksCompleted}
          subtitle={`of ${currentReport.totalTasks} total`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          comparison={showComparison ? comparison.tasksCompleted : undefined}
        />
        <MetricCard
          title="Completion Rate"
          value={`${currentReport.completionRate}%`}
          subtitle="task success rate"
          icon={<Target className="h-4 w-4" />}
          comparison={showComparison ? comparison.completionRate : undefined}
        />
        <MetricCard
          title="Time Worked"
          value={formatTimeWorked(currentReport.totalTimeWorkedSeconds)}
          subtitle={`${formatTimeWorked(currentReport.averageTimePerDay)}/day avg`}
          icon={<Clock className="h-4 w-4" />}
          comparison={showComparison ? comparison.timeWorked : undefined}
          formatValue={(v) => formatTimeWorked(v)}
        />
        <MetricCard
          title="Productive Days"
          value={currentReport.productiveDays}
          subtitle={`of ${currentReport.dailyMetrics.length} days`}
          icon={<Flame className="h-4 w-4" />}
          comparison={showComparison ? comparison.productiveDays : undefined}
        />
      </div>

      {/* Comparison toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showComparison ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowComparison(!showComparison)}
          className="text-xs"
        >
          {showComparison ? "Hide" : "Show"} comparison to previous {reportType === "weekly" ? "week" : "month"}
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tasks Completed Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CardDescription>Daily task completion</CardDescription>
          </CardHeader>
          <CardContent>
            <TasksBarChart data={getTasksChartData(currentReport.dailyMetrics)} />
          </CardContent>
        </Card>

        {/* Completion Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Rate Trend</CardTitle>
            <CardDescription>Daily completion percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletionRateLineChart data={getCompletionRateChartData(currentReport.dailyMetrics)} />
          </CardContent>
        </Card>

        {/* Time Worked Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Time Worked</CardTitle>
            <CardDescription>Hours worked per day</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeWorkedAreaChart data={getTimeWorkedChartData(currentReport.dailyMetrics)} />
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasks by Priority</CardTitle>
            <CardDescription>Completed tasks breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityBreakdown data={currentReport.tasksByPriority} />
          </CardContent>
        </Card>
      </div>

      {/* Habits Heatmap */}
      {habits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Habits Completion</CardTitle>
            <CardDescription>Daily habit tracking heatmap</CardDescription>
          </CardHeader>
          <CardContent>
            <HabitsHeatmap
              habitMetrics={currentReport.habitMetrics}
              dailyMetrics={currentReport.dailyMetrics}
            />
          </CardContent>
        </Card>
      )}

      {/* Top Productive Days */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentReport.mostProductiveDay && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Most Productive Day</div>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {new Date(currentReport.mostProductiveDay.date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400">
                  {currentReport.mostProductiveDay.tasks} tasks completed
                </div>
              </div>
            )}

            {currentReport.leastProductiveDay && currentReport.leastProductiveDay.date !== currentReport.mostProductiveDay?.date && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Room for Improvement</div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {new Date(currentReport.leastProductiveDay.date + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {currentReport.leastProductiveDay.tasks} tasks completed
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Average Performance</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {currentReport.averageTasksPerDay} tasks/day
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {formatTimeWorked(currentReport.averageTimePerDay)} worked/day
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Card for Sharing */}
      <ReportCard report={currentReport} type={reportType} habits={habits} />
    </div>
  )
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  comparison,
  formatValue,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  comparison?: ComparisonData
  formatValue?: (v: number) => string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{title}</span>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
        {comparison && (
          <div className="mt-2 pt-2 border-t">
            <ComparisonIndicator data={comparison} formatValue={formatValue} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Comparison Indicator Component
function ComparisonIndicator({
  data,
  formatValue,
}: {
  data: ComparisonData
  formatValue?: (v: number) => string
}) {
  const { change, changePercent, improved } = data

  if (change === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>No change</span>
      </div>
    )
  }

  const Icon = improved ? ArrowUpRight : ArrowDownRight
  const colorClass = improved ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
  const formattedChange = formatValue ? formatValue(Math.abs(change)) : Math.abs(change)

  return (
    <div className={cn("flex items-center gap-1 text-xs", colorClass)}>
      <Icon className="h-3 w-3" />
      <span>
        {improved ? "+" : "-"}{formattedChange} ({changePercent > 0 ? "+" : ""}{changePercent}%)
      </span>
    </div>
  )
}

// Tasks Bar Chart
function TasksBarChart({ data }: { data: ReturnType<typeof getTasksChartData> }) {
  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    total: {
      label: "Total",
      color: "hsl(var(--chart-2))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span>{name === "completed" ? "Completed" : "Total"}: {value}</span>
              )}
            />
          }
        />
        <Bar dataKey="completed" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

// Completion Rate Line Chart
function CompletionRateLineChart({ data }: { data: ReturnType<typeof getCompletionRateChartData> }) {
  const chartConfig = {
    rate: {
      label: "Completion Rate",
      color: "hsl(var(--chart-1))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} domain={[0, 100]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => <span>{value}%</span>}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="hsl(221.2 83.2% 53.3%)"
          strokeWidth={2}
          dot={{ fill: "hsl(221.2 83.2% 53.3%)", strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}

// Time Worked Area Chart
function TimeWorkedAreaChart({ data }: { data: ReturnType<typeof getTimeWorkedChartData> }) {
  const chartConfig = {
    hours: {
      label: "Hours",
      color: "hsl(var(--chart-3))",
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => <span>{value}h</span>}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="hsl(262.1 83.3% 57.8%)"
          fill="hsl(262.1 83.3% 57.8%)"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ChartContainer>
  )
}

// Priority Breakdown
function PriorityBreakdown({ data }: { data: { high: number; medium: number; low: number; none: number } }) {
  const total = data.high + data.medium + data.low + data.none

  if (total === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No completed tasks
      </div>
    )
  }

  const items = [
    { label: "High", value: data.high, color: "bg-red-500", textColor: "text-red-600 dark:text-red-400" },
    { label: "Medium", value: data.medium, color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
    { label: "Low", value: data.low, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
    { label: "None", value: data.none, color: "bg-gray-400", textColor: "text-gray-600 dark:text-gray-400" },
  ]

  return (
    <div className="space-y-4">
      <div className="h-3 rounded-full overflow-hidden flex">
        {items.map((item) => (
          item.value > 0 && (
            <div
              key={item.label}
              className={cn("h-full", item.color)}
              style={{ width: `${(item.value / total) * 100}%` }}
            />
          )
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-sm", item.color)} />
            <span className="text-xs">
              <span className={cn("font-medium", item.textColor)}>{item.label}</span>
              <span className="text-muted-foreground ml-1">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Habits Heatmap
function HabitsHeatmap({
  habitMetrics,
  dailyMetrics,
}: {
  habitMetrics: WeeklyReport["habitMetrics"]
  dailyMetrics: WeeklyReport["dailyMetrics"]
}) {
  if (habitMetrics.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No habits to display
      </div>
    )
  }

  const dates = dailyMetrics.map((d) => d.date)

  return (
    <div className="space-y-3">
      {/* Date headers */}
      <div className="flex gap-1 pl-24">
        {dates.map((date) => (
          <div key={date} className="w-8 text-center text-[10px] text-muted-foreground">
            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}
          </div>
        ))}
      </div>

      {/* Habit rows */}
      {habitMetrics.map((habit) => (
        <div key={habit.habitId} className="flex items-center gap-1">
          <div className="w-24 truncate text-xs font-medium" title={habit.habitName}>
            {habit.habitName}
          </div>
          <div className="flex gap-1">
            {habit.dailyCompletion.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-medium cursor-default transition-colors",
                      day.completed
                        ? "text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                    style={day.completed ? { backgroundColor: habit.habitColor } : undefined}
                  >
                    {day.value !== undefined ? day.value : (day.completed ? "Y" : "")}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{habit.habitName}</p>
                  <p className="text-xs">
                    {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {day.value !== undefined && day.goal !== undefined ? (
                    <p className="text-xs">{day.value}/{day.goal} completed</p>
                  ) : (
                    <p className="text-xs">{day.completed ? "Completed" : "Not completed"}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div className="ml-2 text-xs text-muted-foreground">
            {habit.completionRate}%
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t mt-4">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-muted" />
          <span className="text-xs text-muted-foreground">Not completed</span>
        </div>
      </div>
    </div>
  )
}

// Report Card for Sharing
function ReportCard({
  report,
  type,
  habits,
}: {
  report: WeeklyReport | MonthlyReport
  type: ReportType
  habits: HabitDefinition[]
}) {
  const periodLabel = type === "weekly"
    ? `Week of ${new Date((report as WeeklyReport).weekStart + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    : `${(report as MonthlyReport).monthName} ${(report as MonthlyReport).year}`

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950 border-2">
      <CardHeader>
        <CardTitle className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              DF
            </div>
            <span>Daily Flow</span>
          </div>
          <div className="text-sm font-normal text-muted-foreground">{periodLabel} Report</div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {report.totalTasksCompleted}
            </div>
            <div className="text-xs text-muted-foreground">Tasks Done</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {report.completionRate}%
            </div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {formatTimeWorked(report.totalTimeWorkedSeconds)}
            </div>
            <div className="text-xs text-muted-foreground">Time Worked</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {report.productiveDays}
            </div>
            <div className="text-xs text-muted-foreground">Productive Days</div>
          </div>
        </div>

        {habits.length > 0 && report.habitMetrics.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <div className="text-xs font-medium text-center text-muted-foreground">Habit Streaks</div>
              <div className="flex flex-wrap justify-center gap-2">
                {report.habitMetrics.slice(0, 4).map((habit) => (
                  <div
                    key={habit.habitId}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${habit.habitColor}20`,
                      color: habit.habitColor,
                    }}
                  >
                    {habit.habitName}: {habit.currentStreak}d
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-4 text-center text-[10px] text-muted-foreground">
          Generated on {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </CardContent>
    </Card>
  )
}

// Compact Reports Button for quick access
export function ReportsButton({
  tasksByDate,
  categoriesByDate,
  habits,
}: {
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
}) {
  return (
    <ReportsDialog
      tasksByDate={tasksByDate}
      categoriesByDate={categoriesByDate}
      habits={habits}
    />
  )
}
