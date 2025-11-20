"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  type BreakReminderSettings,
  type BreakActivity,
  DEFAULT_BREAK_SETTINGS,
  BREAK_ACTIVITIES,
  getBreakSettings,
  saveBreakSettings,
  getTimeSinceLastBreak,
  getWorkTimeDisplay,
  shouldShowReminder,
  snoozeReminder,
  clearSnooze,
  getSnoozedUntil,
  logBreak,
  resetWorkStartTime,
  updateLastActivityTime,
  getLastActivityTime,
  setWorkStartTime,
  getWorkStartTime,
  getRandomActivity,
  getBreakMotivation,
  getTodayBreakStats,
  getWeeklyBreakStats,
} from "@/lib/reminder-utils"
import {
  Bell,
  BellOff,
  Coffee,
  Settings,
  Timer,
  Droplets,
  Eye,
  Flame,
  Moon,
  Footprints,
  X,
  Clock,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlarmClock,
} from "lucide-react"

// Icon lookup for activities
const ActivityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Droplets,
  Eye,
  Moon,
  Footprints,
}

export default function BreakReminder() {
  // Settings state
  const [settings, setSettings] = useState<BreakReminderSettings>(DEFAULT_BREAK_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Reminder state
  const [showReminder, setShowReminder] = useState(false)
  const [workTime, setWorkTime] = useState(0)
  const [suggestedActivity, setSuggestedActivity] = useState<BreakActivity>('stretch')
  const [motivation, setMotivation] = useState('')

  // Break tracking state
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakStartTime, setBreakStartTime] = useState<number | null>(null)
  const [breakDuration, setBreakDuration] = useState(0)

  // Snooze state
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null)

  // Timer refs
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const breakTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityTrackerRef = useRef<NodeJS.Timeout | null>(null)

  // Load settings on mount
  useEffect(() => {
    setSettings(getBreakSettings())
    setSnoozedUntil(getSnoozedUntil())

    // Initialize work start time if not set
    if (!getWorkStartTime()) {
      setWorkStartTime(Date.now())
    }
  }, [])

  // Activity tracking - track user interactions
  useEffect(() => {
    const trackActivity = () => {
      updateLastActivityTime()
    }

    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, trackActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity)
      })
    }
  }, [])

  // Check for inactivity and reset timer
  const checkInactivity = useCallback(() => {
    const lastActivity = getLastActivityTime()
    const inactiveTime = Date.now() - lastActivity

    // If user has been inactive for more than 5 minutes, assume they took a break
    const INACTIVITY_THRESHOLD = 5 * 60 * 1000 // 5 minutes

    if (inactiveTime > INACTIVITY_THRESHOLD && !isOnBreak) {
      // User was likely already taking a break
      resetWorkStartTime()
      setWorkTime(0)
    }
  }, [isOnBreak])

  // Main timer check
  const checkReminderTime = useCallback(() => {
    if (!shouldShowReminder(settings)) {
      return
    }

    // Check for inactivity first
    checkInactivity()

    const timeSinceBreak = getTimeSinceLastBreak()
    setWorkTime(timeSinceBreak)

    const intervalMs = settings.intervalMinutes * 60 * 1000

    if (timeSinceBreak >= intervalMs && !showReminder && !isOnBreak) {
      setSuggestedActivity(getRandomActivity(settings))
      setMotivation(getBreakMotivation())
      setShowReminder(true)
    }

    // Update snooze state
    setSnoozedUntil(getSnoozedUntil())
  }, [settings, showReminder, isOnBreak, checkInactivity])

  // Set up timer check interval
  useEffect(() => {
    if (settings.enabled) {
      // Check every 10 seconds
      checkIntervalRef.current = setInterval(checkReminderTime, 10000)
      // Also check immediately
      checkReminderTime()
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [settings.enabled, checkReminderTime])

  // Break timer
  useEffect(() => {
    if (isOnBreak && breakStartTime) {
      breakTimerRef.current = setInterval(() => {
        setBreakDuration(Math.floor((Date.now() - breakStartTime) / 1000))
      }, 1000)
    }

    return () => {
      if (breakTimerRef.current) {
        clearInterval(breakTimerRef.current)
      }
    }
  }, [isOnBreak, breakStartTime])

  // Handle settings change
  const handleSettingsChange = (newSettings: Partial<BreakReminderSettings>) => {
    const updated = { ...settings, ...newSettings }
    setSettings(updated)
    saveBreakSettings(updated)
  }

  // Handle snooze
  const handleSnooze = (minutes: number) => {
    snoozeReminder(minutes)
    setSnoozedUntil(Date.now() + minutes * 60 * 1000)
    setShowReminder(false)
  }

  // Handle dismiss (until next interval)
  const handleDismiss = () => {
    resetWorkStartTime()
    setWorkTime(0)
    setShowReminder(false)
  }

  // Handle start break
  const handleStartBreak = () => {
    setIsOnBreak(true)
    setBreakStartTime(Date.now())
    setBreakDuration(0)
    setShowReminder(false)
  }

  // Handle end break
  const handleEndBreak = () => {
    if (breakStartTime) {
      const duration = Math.floor((Date.now() - breakStartTime) / 1000)
      const workTimeBefore = Math.floor(workTime / 1000)
      logBreak(duration, suggestedActivity, workTimeBefore)
    }

    setIsOnBreak(false)
    setBreakStartTime(null)
    setBreakDuration(0)
    resetWorkStartTime()
    setWorkTime(0)
    clearSnooze()
    setSnoozedUntil(null)
  }

  // Toggle activity selection
  const toggleActivity = (activity: BreakActivity) => {
    const current = settings.selectedActivities
    const updated = current.includes(activity)
      ? current.filter(a => a !== activity)
      : [...current, activity]

    // Ensure at least one activity is selected
    if (updated.length > 0) {
      handleSettingsChange({ selectedActivities: updated })
    }
  }

  // Get today's stats
  const todayStats = getTodayBreakStats()
  const weeklyStats = getWeeklyBreakStats()

  // Format time for display
  const formatBreakDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate progress to next reminder
  const reminderProgress = settings.intervalMinutes > 0
    ? Math.min(100, (workTime / (settings.intervalMinutes * 60 * 1000)) * 100)
    : 0

  // Render the break reminder notification/modal
  const renderReminder = () => {
    if (settings.reminderType === 'notification') {
      return (
        <Popover open={showReminder} onOpenChange={setShowReminder}>
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-4"
            side="top"
            align="end"
            sideOffset={20}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-amber-500" />
                  <span className="font-semibold">Break Time!</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{motivation}</p>
              <div className="text-xs text-muted-foreground">
                You've been working for {getWorkTimeDisplay(workTime)}
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                {(() => {
                  const activity = BREAK_ACTIVITIES[suggestedActivity]
                  const Icon = ActivityIcons[activity.icon] || Coffee
                  return (
                    <>
                      <Icon className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-medium">{activity.label}</div>
                        <div className="text-xs text-muted-foreground">{activity.description}</div>
                      </div>
                    </>
                  )
                })()}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleStartBreak}>
                  Take Break
                </Button>
                <Select onValueChange={(v) => handleSnooze(parseInt(v))}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Snooze" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )
    }

    // Modal reminder
    return (
      <Dialog open={showReminder} onOpenChange={setShowReminder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-500" />
              Time for a Break!
            </DialogTitle>
            <DialogDescription>{motivation}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {getWorkTimeDisplay(workTime)}
              </div>
              <div className="text-sm text-muted-foreground">of focused work</div>
            </div>

            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="text-sm font-medium">Suggested Activity</div>
              {(() => {
                const activity = BREAK_ACTIVITIES[suggestedActivity]
                const Icon = ActivityIcons[activity.icon] || Coffee
                return (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{activity.label}</div>
                      <div className="text-sm text-muted-foreground">{activity.description}</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => handleSnooze(5)}>
                5 min
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSnooze(10)}>
                10 min
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSnooze(15)}>
                15 min
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={handleDismiss}>
                Dismiss
              </Button>
              <Button onClick={handleStartBreak}>
                Start Break
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Render break in progress overlay
  const renderBreakInProgress = () => {
    if (!isOnBreak) return null

    return (
      <Dialog open={isOnBreak} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-500 animate-pulse" />
              Break in Progress
            </DialogTitle>
            <DialogDescription>
              Enjoy your break! Take this time to relax and recharge.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold text-primary mb-2">
                {formatBreakDuration(breakDuration)}
              </div>
              <div className="text-sm text-muted-foreground">break duration</div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted">
              {(() => {
                const activity = BREAK_ACTIVITIES[suggestedActivity]
                const Icon = ActivityIcons[activity.icon] || Coffee
                return (
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <div>
                      <div className="font-medium">{activity.label}</div>
                      <div className="text-sm text-muted-foreground">{activity.description}</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleEndBreak} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              End Break & Resume Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      {/* Status indicator button */}
      <div className="flex items-center gap-1">
        {/* Quick status/toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative",
                settings.enabled && "text-amber-500 hover:text-amber-600"
              )}
            >
              {settings.enabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
              {snoozedUntil && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Break Reminders</div>
                  <div className="text-xs text-muted-foreground">
                    Every {settings.intervalMinutes} minutes
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => handleSettingsChange({ enabled })}
                />
              </div>

              {settings.enabled && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Time until next break</span>
                      <span className="font-medium">
                        {getWorkTimeDisplay(Math.max(0, settings.intervalMinutes * 60 * 1000 - workTime))}
                      </span>
                    </div>
                    <Progress value={reminderProgress} className="h-1.5" />
                  </div>

                  {snoozedUntil && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <AlarmClock className="h-3 w-3" />
                        Snoozed
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => {
                          clearSnooze()
                          setSnoozedUntil(null)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs border-t pt-3">
                    <span className="text-muted-foreground">Today's breaks</span>
                    <span className="font-medium">{todayStats.totalBreaksToday}</span>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setHistoryOpen(true)}
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                  Stats
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Settings
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Break Reminder Settings</DialogTitle>
            <DialogDescription>
              Customize when and how you receive break reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when it's time for a break
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => handleSettingsChange({ enabled })}
              />
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label htmlFor="interval">Reminder Interval (minutes)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interval"
                  type="number"
                  min={5}
                  max={120}
                  value={settings.intervalMinutes}
                  onChange={(e) => handleSettingsChange({ intervalMinutes: parseInt(e.target.value) || 50 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>

            {/* Reminder Type */}
            <div className="space-y-2">
              <Label>Reminder Style</Label>
              <Select
                value={settings.reminderType}
                onValueChange={(value: 'notification' | 'modal') =>
                  handleSettingsChange({ reminderType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notification">Subtle Notification</SelectItem>
                  <SelectItem value="modal">Full Modal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiet Hours */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Quiet Hours</Label>
                  <p className="text-xs text-muted-foreground">
                    No reminders during this time
                  </p>
                </div>
                <Switch
                  checked={settings.quietHoursEnabled}
                  onCheckedChange={(enabled) => handleSettingsChange({ quietHoursEnabled: enabled })}
                />
              </div>
              {settings.quietHoursEnabled && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleSettingsChange({ quietHoursStart: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleSettingsChange({ quietHoursEnd: e.target.value })}
                    className="w-28"
                  />
                </div>
              )}
            </div>

            {/* Break Activities */}
            <div className="space-y-2">
              <Label>Suggested Activities</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(BREAK_ACTIVITIES) as BreakActivity[]).map((activity) => {
                  const info = BREAK_ACTIVITIES[activity]
                  const isSelected = settings.selectedActivities.includes(activity)
                  return (
                    <Badge
                      key={activity}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected && "bg-primary"
                      )}
                      onClick={() => toggleActivity(activity)}
                    >
                      {info.label}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Break History/Stats Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Break Statistics</DialogTitle>
            <DialogDescription>
              Track your break habits and work patterns.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold">
                      {todayStats.totalBreaksToday}
                    </CardTitle>
                    <CardDescription>Breaks taken</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl font-bold">
                      {Math.floor(todayStats.totalBreakTimeToday / 60)}m
                    </CardTitle>
                    <CardDescription>Total break time</CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Work Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average work interval</span>
                    <span className="font-medium">
                      {todayStats.averageWorkInterval > 0
                        ? getWorkTimeDisplay(todayStats.averageWorkInterval * 1000)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Longest work streak</span>
                    <span className="font-medium">
                      {todayStats.longestWorkStreak > 0
                        ? getWorkTimeDisplay(todayStats.longestWorkStreak * 1000)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current session</span>
                    <span className="font-medium">{getWorkTimeDisplay(workTime)}</span>
                  </div>
                </CardContent>
              </Card>

              {todayStats.totalBreaksToday === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No breaks recorded today. Remember to take regular breaks!
                </div>
              )}
            </TabsContent>

            <TabsContent value="week" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1">
                  {weeklyStats.map((day, i) => (
                    <div key={i} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{day.day}</div>
                      <div
                        className={cn(
                          "h-8 rounded flex items-center justify-center text-xs font-medium",
                          day.breaks === 0 && "bg-muted text-muted-foreground",
                          day.breaks > 0 && day.breaks < 3 && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
                          day.breaks >= 3 && day.breaks < 6 && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                          day.breaks >= 6 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        )}
                      >
                        {day.breaks}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  Number of breaks per day
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Weekly Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total breaks</span>
                      <span className="font-medium">
                        {weeklyStats.reduce((sum, d) => sum + d.breaks, 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder display */}
      {renderReminder()}

      {/* Break in progress overlay */}
      {renderBreakInProgress()}
    </>
  )
}
