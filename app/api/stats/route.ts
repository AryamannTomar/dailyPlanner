import { NextRequest, NextResponse } from 'next/server'
import { getState, getHabits } from '@/lib/state-store'
import { getAllHabitStats, getHabitStats, getHabitMiniStats } from '@/lib/habit-stats'
import type { HabitDefinition } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const habitId = searchParams.get('habitId')
    const daysParam = searchParams.get('days')
    const type = searchParams.get('type') || 'full' // 'full' | 'mini' | 'all'

    const days = daysParam ? parseInt(daysParam, 10) : 30

    // Get state and habits
    const state = await getState()
    const habits = await getHabits()
    const { categoriesByDate } = state

    // Return stats for a specific habit
    if (habitId) {
      const habit = habits.find((h: HabitDefinition) => h.id === habitId)
      if (!habit) {
        return NextResponse.json(
          { error: 'Habit not found' },
          { status: 404 }
        )
      }

      if (type === 'mini') {
        const miniStats = getHabitMiniStats(habitId, categoriesByDate)
        return NextResponse.json({
          habitId,
          habitName: habit.name,
          stats: miniStats,
        })
      }

      const stats = getHabitStats(habitId, categoriesByDate, days)
      return NextResponse.json({
        habitId,
        habitName: habit.name,
        habitColor: habit.color,
        habitIcon: habit.icon,
        days,
        stats,
      })
    }

    // Return stats for all habits
    const allStats = getAllHabitStats(categoriesByDate, habits, days)

    // Enhance with habit metadata
    const statsWithMetadata = habits.map((habit: HabitDefinition) => ({
      habitId: habit.id,
      habitName: habit.name,
      habitColor: habit.color,
      habitIcon: habit.icon,
      stats: allStats[habit.id],
    }))

    return NextResponse.json({
      days,
      habits: statsWithMetadata,
      summary: {
        totalHabits: habits.length,
        averageCompletionRate: habits.length > 0
          ? Math.round(
              statsWithMetadata.reduce(
                (sum: number, h: { stats: { completionRate: number } }) => sum + (h.stats?.completionRate || 0),
                0
              ) / habits.length
            )
          : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
