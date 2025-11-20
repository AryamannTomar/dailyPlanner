import { NextRequest, NextResponse } from 'next/server'
import { getHabits, addHabit, removeHabit, updateHabit } from '@/lib/state-store'

export const runtime = 'nodejs'

// GET all habits
export async function GET() {
  try {
    const habits = await getHabits()
    return NextResponse.json({ habits })
  } catch (error) {
    console.error('Failed to get habits:', error)
    return NextResponse.json(
      { error: 'Failed to get habits' },
      { status: 500 }
    )
  }
}

// POST new habit
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, color, icon } = body

    if (!name || !color || !icon) {
      return NextResponse.json(
        { error: 'Missing required fields: name, color, icon' },
        { status: 400 }
      )
    }

    const habit = await addHabit({ name, color, icon })
    return NextResponse.json({ habit }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to add habit:', error)

    if (error.message === 'Maximum of 8 habits allowed') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add habit' },
      { status: 500 }
    )
  }
}

// DELETE habit
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const habitId = searchParams.get('id')

    if (!habitId) {
      return NextResponse.json(
        { error: 'Missing habit id' },
        { status: 400 }
      )
    }

    const deleted = await removeHabit(habitId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete habit:', error)
    return NextResponse.json(
      { error: 'Failed to delete habit' },
      { status: 500 }
    )
  }
}

// PATCH update habit
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const habitId = searchParams.get('id')

    if (!habitId) {
      return NextResponse.json(
        { error: 'Missing habit id' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { name, color, icon } = body

    const updates: Partial<{ name: string; color: string; icon: string }> = {}
    if (name !== undefined) updates.name = name
    if (color !== undefined) updates.color = color
    if (icon !== undefined) updates.icon = icon

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    const habit = await updateHabit(habitId, updates)

    if (!habit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ habit })
  } catch (error) {
    console.error('Failed to update habit:', error)
    return NextResponse.json(
      { error: 'Failed to update habit' },
      { status: 500 }
    )
  }
}
