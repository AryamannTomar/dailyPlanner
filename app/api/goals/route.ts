import { NextRequest, NextResponse } from 'next/server'
import { getDailyGoals, updateDailyGoals, updateGoalConfig, calculateGoalProgress, resetDailyGoals, incrementPomodoro } from '@/lib/state-store'

export const runtime = 'nodejs'

// GET /api/goals - Get current goals configuration
// GET /api/goals?date=YYYY-MM-DD - Get goals with calculated progress for a specific date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    if (date) {
      // Calculate and return goals with progress for the specified date
      const goals = await calculateGoalProgress(date)
      const config = await getDailyGoals()
      return NextResponse.json({
        goals,
        lastResetDate: config.lastResetDate
      })
    }

    // Return current goals configuration
    const config = await getDailyGoals()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error getting goals:', error)
    return NextResponse.json({ error: 'Failed to get goals' }, { status: 500 })
  }
}

// PATCH /api/goals - Update goals configuration
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle different update operations
    if (body.goalId && (body.target !== undefined || body.enabled !== undefined)) {
      // Update a specific goal's configuration
      const updated = await updateGoalConfig(body.goalId, {
        target: body.target,
        enabled: body.enabled
      })

      if (!updated) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }

      return NextResponse.json(updated)
    }

    if (body.reset && body.date) {
      // Reset goals for a new day
      const config = await resetDailyGoals(body.date)
      return NextResponse.json(config)
    }

    if (body.incrementPomodoro) {
      // Increment pomodoro count
      const goals = await incrementPomodoro()
      return NextResponse.json({ goals })
    }

    if (body.goals) {
      // Update all goals configuration
      const config = await updateDailyGoals({ goals: body.goals })
      return NextResponse.json(config)
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  } catch (error) {
    console.error('Error updating goals:', error)
    return NextResponse.json({ error: 'Failed to update goals' }, { status: 500 })
  }
}
