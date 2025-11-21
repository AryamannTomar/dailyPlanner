"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { isStreakMilestone, getMilestoneMessage } from "@/lib/streak-utils"

type ConfettiPiece = {
  id: number
  left: number
  color: string
  delay: number
  duration: number
}

const COLORS = [
  "#f97316", // orange
  "#ef4444", // red
  "#a855f7", // purple
  "#eab308", // yellow
  "#22c55e", // green
  "#3b82f6", // blue
]

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }))
}

type StreakCelebrationProps = {
  streak: number
  habitName: string
  show: boolean
  onClose: () => void
}

export default function StreakCelebration({
  streak,
  habitName,
  show,
  onClose,
}: StreakCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (show && isStreakMilestone(streak)) {
      setConfetti(generateConfetti(50))

      // Auto-close after animation
      const timer = setTimeout(() => {
        onClose()
        setConfetti([])
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [show, streak, onClose])

  if (!mounted || !show || !isStreakMilestone(streak)) {
    return null
  }

  const milestoneMessage = getMilestoneMessage(streak)

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Confetti pieces */}
      <div className="confetti-container">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              borderRadius: Math.random() > 0.5 ? "50%" : "0",
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      {/* Celebration message */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-auto">
        <div
          className="bg-background/95 backdrop-blur-sm border rounded-2xl p-6 shadow-2xl animate-celebrate max-w-sm mx-4"
          onClick={onClose}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl animate-bounce">🎉</div>
            <h2 className="text-xl font-bold">{milestoneMessage}</h2>
            <p className="text-muted-foreground">
              Incredible work on your{" "}
              <span className="font-semibold text-foreground">{habitName}</span>{" "}
              habit!
            </p>
            <p className="text-sm text-muted-foreground">
              Click anywhere to dismiss
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook to manage streak celebrations
export function useStreakCelebration() {
  const [celebration, setCelebration] = useState<{
    streak: number
    habitName: string
    show: boolean
  } | null>(null)

  const celebrate = (streak: number, habitName: string) => {
    if (isStreakMilestone(streak)) {
      setCelebration({ streak, habitName, show: true })
    }
  }

  const closeCelebration = () => {
    setCelebration(null)
  }

  return {
    celebration,
    celebrate,
    closeCelebration,
  }
}
