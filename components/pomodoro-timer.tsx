"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Timer,
  Coffee,
  Target,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  X,
  Flame,
  Minimize2,
  Maximize2,
} from "lucide-react"
import {
  type PomodoroSettings,
  type PomodoroSessionType,
  type PomodoroState,
  type PomodoroTimerState,
  type PomodoroStats,
  DEFAULT_POMODORO_SETTINGS,
  loadPomodoroSettings,
  savePomodoroSettings,
  addPomodoroSession,
  getPomodoroStats,
  formatTimeRemaining,
  getSessionDuration,
  getNextSessionType,
  getSessionTypeLabel,
  getSessionTypeColor,
  getSessionTypeBgColor,
  playNotificationSound,
  requestNotificationPermission,
  showBrowserNotification,
} from "@/lib/pomodoro-utils"

// Pomodoro Settings Dialog Component
function PomodoroSettingsDialog({
  settings,
  onSettingsChange,
  open,
  onOpenChange,
}: {
  settings: PomodoroSettings
  onSettingsChange: (settings: PomodoroSettings) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [localSettings, setLocalSettings] = useState<PomodoroSettings>(settings)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = () => {
    onSettingsChange(localSettings)
    savePomodoroSettings(localSettings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pomodoro Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Durations (minutes)</h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="work-duration" className="text-xs">
                  Work
                </Label>
                <Input
                  id="work-duration"
                  type="number"
                  min={1}
                  max={120}
                  value={localSettings.workDuration}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      workDuration: Math.max(1, Math.min(120, parseInt(e.target.value) || 25)),
                    })
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="short-break" className="text-xs">
                  Short Break
                </Label>
                <Input
                  id="short-break"
                  type="number"
                  min={1}
                  max={60}
                  value={localSettings.shortBreakDuration}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      shortBreakDuration: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)),
                    })
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="long-break" className="text-xs">
                  Long Break
                </Label>
                <Input
                  id="long-break"
                  type="number"
                  min={1}
                  max={120}
                  value={localSettings.longBreakDuration}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      longBreakDuration: Math.max(1, Math.min(120, parseInt(e.target.value) || 15)),
                    })
                  }
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Sessions before long break */}
          <div className="space-y-2">
            <Label htmlFor="sessions-before-long" className="text-sm font-medium">
              Sessions before long break
            </Label>
            <Input
              id="sessions-before-long"
              type="number"
              min={1}
              max={10}
              value={localSettings.sessionsBeforeLongBreak}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  sessionsBeforeLongBreak: Math.max(1, Math.min(10, parseInt(e.target.value) || 4)),
                })
              }
              className="h-9 w-24"
            />
          </div>

          {/* Auto-start options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Auto-start</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-start-breaks" className="text-sm">
                Auto-start breaks
              </Label>
              <Switch
                id="auto-start-breaks"
                checked={localSettings.autoStartBreaks}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoStartBreaks: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-start-work" className="text-sm">
                Auto-start work sessions
              </Label>
              <Switch
                id="auto-start-work"
                checked={localSettings.autoStartWork}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoStartWork: checked })
                }
              />
            </div>
          </div>

          {/* Sound settings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Notifications</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled" className="text-sm">
                Sound notifications
              </Label>
              <Switch
                id="sound-enabled"
                checked={localSettings.soundEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, soundEnabled: checked })
                }
              />
            </div>

            {localSettings.soundEnabled && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Volume</Label>
                  <span className="text-sm text-muted-foreground">{localSettings.volume}%</span>
                </div>
                <Slider
                  value={[localSettings.volume]}
                  onValueChange={(value) =>
                    setLocalSettings({ ...localSettings, volume: value[0] })
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Pomodoro Timer Component
export default function PomodoroTimer({
  onStartForTask,
  linkedTaskId,
  linkedTaskDescription,
}: {
  onStartForTask?: (taskId: string, taskDescription: string) => void
  linkedTaskId?: string
  linkedTaskDescription?: string
}) {
  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Timer state
  const [timerState, setTimerState] = useState<PomodoroTimerState>({
    state: 'idle',
    sessionType: 'work',
    timeRemaining: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
    totalTime: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
    sessionsCompleted: 0,
    currentTaskId: linkedTaskId,
    currentTaskDescription: linkedTaskDescription,
  })

  // UI state
  const [isMinimized, setIsMinimized] = useState(false)
  const [stats, setStats] = useState<PomodoroStats | null>(null)

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Load settings on mount
  useEffect(() => {
    const loadedSettings = loadPomodoroSettings()
    setSettings(loadedSettings)
    setTimerState(prev => ({
      ...prev,
      timeRemaining: loadedSettings.workDuration * 60,
      totalTime: loadedSettings.workDuration * 60,
    }))

    // Request notification permission
    requestNotificationPermission()

    // Load stats
    setStats(getPomodoroStats())
  }, [])

  // Update linked task
  useEffect(() => {
    if (linkedTaskId && linkedTaskDescription) {
      setTimerState(prev => ({
        ...prev,
        currentTaskId: linkedTaskId,
        currentTaskDescription: linkedTaskDescription,
      }))
    }
  }, [linkedTaskId, linkedTaskDescription])

  // Timer tick effect
  useEffect(() => {
    if (timerState.state === 'running' && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000)
        const remaining = timerState.totalTime - elapsed

        if (remaining <= 0) {
          // Timer completed
          clearInterval(intervalRef.current!)
          handleTimerComplete()
        } else {
          setTimerState(prev => ({
            ...prev,
            timeRemaining: remaining,
          }))
        }
      }, 100)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [timerState.state, timerState.totalTime])

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    const { sessionType, totalTime, currentTaskId, currentTaskDescription, sessionsCompleted } = timerState

    // Record the session
    addPomodoroSession({
      type: sessionType,
      duration: totalTime,
      completed: true,
      taskId: currentTaskId,
      taskDescription: currentTaskDescription,
    })

    // Update stats
    setStats(getPomodoroStats())

    // Play sound and show notification
    if (settings.soundEnabled) {
      playNotificationSound(settings.volume)
    }

    const nextType = getNextSessionType(sessionType, sessionsCompleted, settings)
    const nextDuration = getSessionDuration(nextType, settings)

    // Show browser notification
    if (sessionType === 'work') {
      showBrowserNotification(
        'Work Session Complete!',
        nextType === 'longBreak'
          ? `Great job! Time for a ${settings.longBreakDuration} minute long break.`
          : `Well done! Time for a ${settings.shortBreakDuration} minute break.`
      )
    } else {
      showBrowserNotification(
        'Break Complete!',
        `Ready for another ${settings.workDuration} minute work session?`
      )
    }

    // Update state
    const newSessionsCompleted = sessionType === 'work' ? sessionsCompleted + 1 : sessionsCompleted

    setTimerState(prev => ({
      ...prev,
      state: 'completed',
      sessionType: nextType,
      timeRemaining: nextDuration,
      totalTime: nextDuration,
      sessionsCompleted: newSessionsCompleted,
    }))

    // Auto-start next session if enabled
    const shouldAutoStart =
      (sessionType === 'work' && settings.autoStartBreaks) ||
      (sessionType !== 'work' && settings.autoStartWork)

    if (shouldAutoStart) {
      setTimeout(() => {
        startTimeRef.current = Date.now()
        setTimerState(prev => ({
          ...prev,
          state: 'running',
        }))
      }, 1000)
    }
  }, [timerState, settings])

  // Start timer
  const handleStart = useCallback(() => {
    if (timerState.state === 'paused') {
      // Resume from pause
      const elapsed = timerState.totalTime - timerState.timeRemaining
      startTimeRef.current = Date.now() - elapsed * 1000
    } else {
      // Fresh start
      startTimeRef.current = Date.now()
    }

    setTimerState(prev => ({
      ...prev,
      state: 'running',
    }))
  }, [timerState])

  // Pause timer
  const handlePause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setTimerState(prev => ({
      ...prev,
      state: 'paused',
    }))
  }, [])

  // Reset timer
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const duration = getSessionDuration(timerState.sessionType, settings)

    setTimerState(prev => ({
      ...prev,
      state: 'idle',
      timeRemaining: duration,
      totalTime: duration,
    }))
    startTimeRef.current = null
  }, [timerState.sessionType, settings])

  // Switch session type
  const switchSessionType = useCallback((type: PomodoroSessionType) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    const duration = getSessionDuration(type, settings)

    setTimerState(prev => ({
      ...prev,
      state: 'idle',
      sessionType: type,
      timeRemaining: duration,
      totalTime: duration,
    }))
    startTimeRef.current = null
  }, [settings])

  // Clear linked task
  const handleClearTask = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      currentTaskId: undefined,
      currentTaskDescription: undefined,
    }))
  }, [])

  // Calculate progress percentage
  const progressPercent = timerState.totalTime > 0
    ? ((timerState.totalTime - timerState.timeRemaining) / timerState.totalTime) * 100
    : 0

  // Circular progress dimensions
  const size = isMinimized ? 80 : 160
  const strokeWidth = isMinimized ? 6 : 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progressPercent / 100) * circumference

  // Get session color
  const sessionColor = timerState.sessionType === 'work'
    ? '#ef4444'
    : timerState.sessionType === 'shortBreak'
    ? '#22c55e'
    : '#3b82f6'

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="shadow-lg border-2" style={{ borderColor: sessionColor }}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Mini circular progress */}
              <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="rotate-[-90deg]">
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-muted/20"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={sessionColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-[stroke-dashoffset] duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold tabular-nums">
                    {formatTimeRemaining(timerState.timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  {timerState.state === 'running' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePause}
                      className="h-7 w-7 p-0"
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStart}
                      className="h-7 w-7 p-0"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 w-7 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(false)}
                    className="h-7 w-7 p-0"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  {getSessionTypeLabel(timerState.sessionType)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-[280px] shadow-xl border-2" style={{ borderColor: sessionColor }}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" style={{ color: sessionColor }} />
              <span className="text-sm font-medium">Pomodoro</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-7 w-7 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-7 w-7 p-0"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Session Type Selector */}
          <div className="flex gap-1 mb-4">
            <Button
              variant={timerState.sessionType === 'work' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchSessionType('work')}
              className={cn(
                "flex-1 text-xs",
                timerState.sessionType === 'work' && "bg-red-500 hover:bg-red-600"
              )}
            >
              <Target className="h-3 w-3 mr-1" />
              Work
            </Button>
            <Button
              variant={timerState.sessionType === 'shortBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchSessionType('shortBreak')}
              className={cn(
                "flex-1 text-xs",
                timerState.sessionType === 'shortBreak' && "bg-green-500 hover:bg-green-600"
              )}
            >
              <Coffee className="h-3 w-3 mr-1" />
              Short
            </Button>
            <Button
              variant={timerState.sessionType === 'longBreak' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchSessionType('longBreak')}
              className={cn(
                "flex-1 text-xs",
                timerState.sessionType === 'longBreak' && "bg-blue-500 hover:bg-blue-600"
              )}
            >
              <Coffee className="h-3 w-3 mr-1" />
              Long
            </Button>
          </div>

          {/* Circular Timer */}
          <div className="flex justify-center mb-4">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="rotate-[-90deg]">
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-muted/20"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={sessionColor}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">
                  {formatTimeRemaining(timerState.timeRemaining)}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {getSessionTypeLabel(timerState.sessionType)}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {timerState.state === 'running' ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePause}
                className="h-12 w-12 rounded-full p-0"
              >
                <Pause className="h-6 w-6" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStart}
                className="h-12 w-12 rounded-full p-0"
                style={{ backgroundColor: sessionColor }}
              >
                <Play className="h-6 w-6" />
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              onClick={handleReset}
              className="h-12 w-12 rounded-full p-0"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* Session Counter */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">Sessions:</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    i < timerState.sessionsCompleted % settings.sessionsBeforeLongBreak
                      ? "bg-red-500"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium">{timerState.sessionsCompleted}</span>
          </div>

          {/* Linked Task */}
          {timerState.currentTaskDescription && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Target className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{timerState.currentTaskDescription}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearTask}
                className="h-5 w-5 p-0 shrink-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold">{stats.today.workSessions}</div>
                <div className="text-[10px] text-muted-foreground">Today</div>
              </div>
              <div>
                <div className="text-lg font-bold">{stats.today.totalWorkMinutes}m</div>
                <div className="text-[10px] text-muted-foreground">Focus Time</div>
              </div>
              <div>
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  {stats.currentStreak}
                  {stats.currentStreak > 0 && <Flame className="h-4 w-4 text-orange-500" />}
                </div>
                <div className="text-[10px] text-muted-foreground">Streak</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <PomodoroSettingsDialog
        settings={settings}
        onSettingsChange={setSettings}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  )
}

// Export a button component to start Pomodoro for a specific task
export function PomodoroTaskButton({
  taskId,
  taskDescription,
  onStart,
}: {
  taskId: string
  taskDescription: string
  onStart: (taskId: string, taskDescription: string) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onStart(taskId, taskDescription)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 cursor-pointer"
        >
          <Timer className="h-4 w-4" />
          <span className="sr-only">Start Pomodoro for task</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Start Pomodoro timer</p>
      </TooltipContent>
    </Tooltip>
  )
}
