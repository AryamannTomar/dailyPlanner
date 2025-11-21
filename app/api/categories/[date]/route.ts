import { NextRequest, NextResponse } from 'next/server'
import { getState, updateCategory, incrementHabitValue, decrementHabitValue, setHabitValue, DEFAULT_HABITS } from '@/lib/state-store'
import type { HabitEntry } from '@/lib/types'

export const runtime = 'nodejs'

// Helper to get default categories based on habits
function getDefaultCategories(habits: typeof DEFAULT_HABITS): Record<string, HabitEntry> {
  const defaults: Record<string, HabitEntry> = {}
  habits.forEach(habit => {
    if (habit.goal && habit.goal > 0) {
      defaults[habit.id] = { value: 0, goal: habit.goal }
    } else {
      defaults[habit.id] = false
    }
  })
  return defaults
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const state = await getState()
    const defaultCategories = getDefaultCategories(state.habits)
    return NextResponse.json({
      categories: state.categoriesByDate[date] || defaultCategories
    })
  } catch (error) {
    console.error('Error in categories GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', categories: {} },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const body = await req.json()
    const { key, value, operation, amount = 1 } = body || {}

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    let result

    // Handle operations (increment, decrement, set)
    if (operation === 'increment') {
      result = await incrementHabitValue(date, key, amount)
    } else if (operation === 'decrement') {
      result = await decrementHabitValue(date, key, amount)
    } else if (operation === 'set' && typeof value === 'number') {
      result = await setHabitValue(date, key, value)
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      // Direct value update (supports both boolean and numeric)
      result = await updateCategory(date, key, value)
    } else {
      return NextResponse.json({
        error: 'Invalid request: provide value (boolean/number) or operation (increment/decrement/set)'
      }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in categories PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


