"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Minus,
  Maximize2,
  Coffee,
  Target,
} from "lucide-react"
import {
  type PomodoroSettings,
  type PomodoroSessionType,
  type PomodoroTimerState,
  DEFAULT_POMODORO_SETTINGS,
  loadPomodoroSettings,
  addPomodoroSession,
  formatTimeRemaining,
  getSessionDuration,
  getNextSessionType,
  playNotificationSound,
  showBrowserNotification,
} from "@/lib/pomodoro-utils"
import type { WidgetSize } from "@/lib/dashboard-utils"

interface PomodoroWidgetProps {
  size: WidgetSize
  minimized: boolean
  onMinimize: () => void
}

export function PomodoroWidget({
  size,
  minimized,
  onMinimize,
}: PomodoroWidgetProps) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_POMODORO_SETTINGS)
  const [timerState, setTimerState] = useState<PomodoroTimerState>({
    state: 'idle',
    sessionType: 'work',
    timeRemaining: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
    totalTime: DEFAULT_POMODORO_SETTINGS.workDuration * 60,
    sessionsCompleted: 0,
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const loadedSettings = loadPomodoroSettings()
    setSettings(loadedSettings)
    setTimerState(prev => ({
      ...prev,
      timeRemaining: loadedSettings.workDuration * 60,
      totalTime: loadedSettings.workDuration * 60,
    }))
  }, [])

  useEffect(() => {
    if (timerState.state === 'running' && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000)
        const remaining = timerState.totalTime - elapsed

        if (remaining <= 0) {
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

  const handleTimerComplete = useCallback(() => {
    const { sessionType, totalTime, sessionsCompleted } = timerState

    addPomodoroSession({
      type: sessionType,
      duration: totalTime,
      completed: true,
    })

    if (settings.soundEnabled) {
      playNotificationSound(settings.volume)
    }

    const nextType = getNextSessionType(sessionType, sessionsCompleted, settings)
    const nextDuration = getSessionDuration(nextType, settings)

    if (sessionType === 'work') {
      showBrowserNotification(
        'Work Session Complete!',
        nextType === 'longBreak'
          ? `Time for a ${settings.longBreakDuration}min long break.`
          : `Time for a ${settings.shortBreakDuration}min break.`
      )
    } else {
      showBrowserNotification(
        'Break Complete!',
        `Ready for another ${settings.workDuration}min work session?`
      )
    }

    const newSessionsCompleted = sessionType === 'work' ? sessionsCompleted + 1 : sessionsCompleted

    setTimerState(prev => ({
      ...prev,
      state: 'completed',
      sessionType: nextType,
      timeRemaining: nextDuration,
      totalTime: nextDuration,
      sessionsCompleted: newSessionsCompleted,
    }))
  }, [timerState, settings])

  const handleStart = useCallback(() => {
    if (timerState.state === 'paused') {
      const elapsed = timerState.totalTime - timerState.timeRemaining
      startTimeRef.current = Date.now() - elapsed * 1000
    } else {
      startTimeRef.current = Date.now()
    }

    setTimerState(prev => ({
      ...prev,
      state: 'running',
    }))
  }, [timerState])

  const handlePause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setTimerState(prev => ({
      ...prev,
      state: 'paused',
    }))
  }, [])

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

  const progressPercent = timerState.totalTime > 0
    ? ((timerState.totalTime - timerState.timeRemaining) / timerState.totalTime) * 100
    : 0

  const sessionColor = timerState.sessionType === 'work'
    ? '#ef4444'
    : timerState.sessionType === 'shortBreak'
    ? '#22c55e'
    : '#3b82f6'

  if (minimized) {
    return (
      <Card className="h-full">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" style={{ color: sessionColor }} />
            <span className="text-sm font-medium">Pomodoro</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">{formatTimeRemaining(timerState.timeRemaining)}</span>
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
            <Timer className="h-4 w-4" style={{ color: sessionColor }} />
            Pomodoro Timer
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onMinimize} className="h-6 w-6 p-0">
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-3 flex flex-col items-center justify-center">
        {/* Session type buttons */}
        <div className="flex gap-1 mb-3 w-full">
          <Button
            variant={timerState.sessionType === 'work' ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchSessionType('work')}
            className={cn(
              "flex-1 text-xs h-7",
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
              "flex-1 text-xs h-7",
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
              "flex-1 text-xs h-7",
              timerState.sessionType === 'longBreak' && "bg-blue-500 hover:bg-blue-600"
            )}
          >
            <Coffee className="h-3 w-3 mr-1" />
            Long
          </Button>
        </div>

        {/* Timer display */}
        <div className="text-4xl font-bold font-mono mb-3" style={{ color: sessionColor }}>
          {formatTimeRemaining(timerState.timeRemaining)}
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full transition-all duration-100"
            style={{ width: `${progressPercent}%`, backgroundColor: sessionColor }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {timerState.state === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              className="h-8 w-8 p-0 rounded-full"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              className="h-8 w-8 p-0 rounded-full"
              style={{ backgroundColor: sessionColor }}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 w-8 p-0 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Session counter */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-muted-foreground">Sessions:</span>
          <span className="text-xs font-medium">{timerState.sessionsCompleted}</span>
        </div>
      </CardContent>
    </Card>
  )
}
