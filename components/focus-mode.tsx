"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  X,
  Check,
  SkipForward,
  Clock,
  Target,
  AlertCircle,
  Circle,
  CircleDot,
  Coffee,
  Keyboard,
  Volume2,
  VolumeX,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react"
import { formatTime12h } from "@/lib/time-utils"

// Tag colors for visual variety
const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// Priority badge component
function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" | null | undefined }) {
  if (!priority) return null

  const config = {
    high: {
      icon: AlertCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "High Priority"
    },
    medium: {
      icon: Circle,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      label: "Medium Priority"
    },
    low: {
      icon: CircleDot,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      label: "Low Priority"
    }
  }

  const { icon: Icon, color, bgColor, label } = config[priority]

  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium", bgColor, color)}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  )
}

// Format elapsed time as HH:MM:SS
function formatElapsedTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Break suggestion messages
const BREAK_SUGGESTIONS = [
  "Great work! Take a 5-minute break to stretch.",
  "Well done! How about a quick walk?",
  "Task complete! Grab some water and rest your eyes.",
  "Excellent! Take a moment to breathe deeply.",
  "Nice job! Stand up and move around a bit.",
]

export type FocusModeProps = {
  isActive: boolean
  currentTask: Task | null
  tasks: Task[]
  completedCount: number
  totalCount: number
  onComplete: (taskId: string) => void
  onSkip: () => void
  onExit: () => void
  onSelectTask: (taskId: string) => void
}

export default function FocusMode({
  isActive,
  currentTask,
  tasks,
  completedCount,
  totalCount,
  onComplete,
  onSkip,
  onExit,
  onSelectTask,
}: FocusModeProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showBreakSuggestion, setShowBreakSuggestion] = useState(false)
  const [breakMessage, setBreakMessage] = useState("")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showKeyboardHints, setShowKeyboardHints] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const pausedTimeRef = useRef<number>(0)

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio()
    // Use a simple beep sound encoded as base64
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQMMeNLZoXUYDFjE2Y5wFhpe0dCcfkwlMpT9yH1dKSNCxtyPRkw8i9PkkWROR2+v/39QU16uzqNZUHGn7eiCVWCBxN3Ol4NuVJzr24xrX4zR58+3lXB0rvrxonN7c9n6t4h5cLTe9L2ogYVjwuPGvqGKfmzv8c2wlJZ6cv30vaCjoqN+7/vQsqOOlIWJ8/rSr6eRjoWN5/vYrbCRiId95f/YsbeUi4l6ypz/1rXDuX58b8bqz8DDwHx0cNG/y87Mv3drbdO0wM7Lu2xhXM+1vtLPt2dbUdGzu9XStGlUStatu9nSrmRQQNusvdjUrmRRPeCvvN3WsmVUOeasxuDXsWdVNOWsyeHYsWpVMOesyuTYsmtYK+qxz+bZtGtbKO+20OfbtW1cJvK31OvdtnJfIvW62O7et3VhHvi+2vHfuXljG/zB3fPhvH1kGP7E4Pbjv4BmFQHI4/jlwYNoEgPK5fnow4ZrDwXO6Prqx4ptDAjR7Pzszox1CQrV8P7v0JB6BQzZ8wDx0pR+AwzZ8gHw0JB5Ag3a8QHu0JB7AAra7v7t0pN8AA7f9APx1ZV+AA/j+gf015aBARDl/Qr32JmEARHl/Qv22ZiDARHl/Av02JeBAA/i+Qn01paAAAzg9gb01pV/AAzg9gb005N8AAvf9QTy0pF6AAzh9wTy0pB5AAzi+ATx0Y93AAzi+ATu0Ix0AAvi9wPtzop0AAvh9gLszIlyAAri9QHryodwAAri9AHpyIVuAAnh8wDpx4RsAAjg8v/oxoJrAAfe8P/nxYBoAAbc7v/mw35nAAXZ6/7lwnxlAAXX6f3jwHpjAATU5v3hvnhhAATS5Pzgvndh"
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Handle visibility animation
  useEffect(() => {
    if (isActive) {
      // Small delay for enter animation
      requestAnimationFrame(() => {
        setIsVisible(true)
      })
    } else {
      setIsVisible(false)
    }
  }, [isActive])

  // Reset timer when task changes
  useEffect(() => {
    if (currentTask) {
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      setElapsedSeconds(0)
      setIsPaused(false)
      setShowBreakSuggestion(false)
    }
  }, [currentTask?.id])

  // Timer effect
  useEffect(() => {
    if (!isActive || !currentTask || isPaused) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTimeRef.current) / 1000) + pausedTimeRef.current
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, currentTask, isPaused])

  // Pause/resume handler
  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      // Resuming
      startTimeRef.current = Date.now()
    } else {
      // Pausing - save elapsed time
      pausedTimeRef.current = elapsedSeconds
    }
    setIsPaused(!isPaused)
  }, [isPaused, elapsedSeconds])

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Ignore audio play errors
      })
    }
  }, [soundEnabled])

  // Handle task completion
  const handleComplete = useCallback(() => {
    if (!currentTask) return

    playCompletionSound()

    // Show break suggestion randomly (30% chance after completing a task)
    if (Math.random() < 0.3) {
      const randomMessage = BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)]
      setBreakMessage(randomMessage)
      setShowBreakSuggestion(true)

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowBreakSuggestion(false)
      }, 5000)
    }

    onComplete(currentTask.id)
  }, [currentTask, onComplete, playCompletionSound])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case " ":
          e.preventDefault()
          if (currentTask && !currentTask.completed) {
            handleComplete()
          }
          break
        case "n":
        case "N":
          e.preventDefault()
          onSkip()
          break
        case "Escape":
          e.preventDefault()
          onExit()
          break
        case "p":
        case "P":
          e.preventDefault()
          handlePauseToggle()
          break
        case "?":
          e.preventDefault()
          setShowKeyboardHints(!showKeyboardHints)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isActive, currentTask, handleComplete, onSkip, onExit, handlePauseToggle, showKeyboardHints])

  if (!isActive) return null

  // Get incomplete tasks for navigation
  const incompleteTasks = tasks.filter(t => !t.completed)
  const currentIndex = currentTask ? incompleteTasks.findIndex(t => t.id === currentTask.id) : -1

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Dark overlay background */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onExit}
      />

      {/* Main content */}
      <div
        className={cn(
          "relative z-10 w-full max-w-2xl mx-4 transition-all duration-500",
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        )}
      >
        {/* Header with progress and controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-emerald-400" />
            <span className="text-white/80 text-sm font-medium">Focus Mode</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <span className="text-white/60 text-sm">Progress</span>
              <span className="text-white font-medium text-sm">
                {completedCount} / {totalCount}
              </span>
            </div>

            {/* Sound toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Keyboard hints toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKeyboardHints(!showKeyboardHints)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <Keyboard className="h-4 w-4" />
            </Button>

            {/* Exit button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress
            value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
            className="h-2 bg-white/10"
          />
        </div>

        {/* Main task card */}
        {currentTask ? (
          <Card className="bg-zinc-900/90 border-zinc-700/50 shadow-2xl">
            <CardContent className="p-8">
              {/* Timer display */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-4">
                  <Clock className="h-8 w-8 text-emerald-400" />
                  <span className="text-5xl font-mono font-bold text-white tracking-wider">
                    {formatElapsedTime(elapsedSeconds)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePauseToggle}
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              {/* Task time info */}
              <div className="flex items-center justify-center gap-4 mb-6 text-white/60 text-sm">
                <span>Start: {formatTime12h(currentTask.startTime)}</span>
                <ChevronRight className="h-4 w-4" />
                <span>Target: {formatTime12h(currentTask.approxEndTime)}</span>
              </div>

              {/* Task description */}
              <h2 className="text-3xl font-semibold text-white text-center mb-6 leading-relaxed">
                {currentTask.description}
              </h2>

              {/* Priority and tags */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                <PriorityBadge priority={currentTask.priority} />
                {currentTask.tags && currentTask.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn("text-xs px-2 py-1 border-0", getTagColor(tag))}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Task notes */}
              {currentTask.notes && (
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {currentTask.notes}
                  </p>
                </div>
              )}

              {/* Subtasks progress */}
              {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                <div className="mb-6">
                  <div className="text-white/60 text-sm mb-2">
                    Subtasks: {currentTask.subtasks.filter(s => s.completed).length} / {currentTask.subtasks.length}
                  </div>
                  <Progress
                    value={(currentTask.subtasks.filter(s => s.completed).length / currentTask.subtasks.length) * 100}
                    className="h-1.5 bg-white/10"
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={handleComplete}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 text-lg gap-3"
                >
                  <Check className="h-5 w-5" />
                  Complete
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onSkip}
                  className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg gap-3"
                >
                  <SkipForward className="h-5 w-5" />
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-zinc-900/90 border-zinc-700/50 shadow-2xl">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-semibold text-white mb-2">All tasks completed!</h2>
              <p className="text-white/60 mb-6">Great job! You've finished all your tasks.</p>
              <Button onClick={onExit} className="bg-emerald-600 hover:bg-emerald-500">
                Exit Focus Mode
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Break suggestion */}
        {showBreakSuggestion && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-4">
            <Card className="bg-amber-500/20 border-amber-500/30">
              <CardContent className="p-4 flex items-center gap-3">
                <Coffee className="h-5 w-5 text-amber-400" />
                <p className="text-amber-200 text-sm">{breakMessage}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBreakSuggestion(false)}
                  className="ml-auto text-amber-200 hover:text-amber-100 hover:bg-amber-500/20"
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Task navigation */}
        {incompleteTasks.length > 1 && currentTask && (
          <div className="mt-6">
            <div className="text-white/40 text-xs text-center mb-3">
              Task {currentIndex + 1} of {incompleteTasks.length} remaining
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1">
              {incompleteTasks.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-lg text-xs transition-colors max-w-[150px] truncate",
                    task.id === currentTask.id
                      ? "bg-emerald-600 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  )}
                  title={task.description}
                >
                  {index + 1}. {task.description}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        {showKeyboardHints && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="text-white/80 text-sm font-medium mb-3">Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Space</kbd>
                    <span className="text-white/60">Complete task</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">N</kbd>
                    <span className="text-white/60">Skip to next</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">P</kbd>
                    <span className="text-white/60">Pause/Resume timer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">Esc</kbd>
                    <span className="text-white/60">Exit focus mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/60">?</kbd>
                    <span className="text-white/60">Toggle shortcuts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
