import { NextRequest, NextResponse } from 'next/server'
import { getState, saveState, createTask, deleteTask } from '@/lib/state-store'
import type { Task } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fromDate, toDate, taskIds, deleteOriginals = false } = body

    // Validate required fields
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'fromDate and toDate are required' },
        { status: 400 }
      )
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const state = await getState()
    const sourceTasks = state.tasksByDate[fromDate] || []

    // Determine which tasks to carry over
    let tasksToCarry: Task[]
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      // Carry specific tasks
      tasksToCarry = sourceTasks.filter(
        task => taskIds.includes(task.id) && !task.completed
      )
    } else {
      // Carry all incomplete tasks
      tasksToCarry = sourceTasks.filter(task => !task.completed)
    }

    if (tasksToCarry.length === 0) {
      return NextResponse.json({
        message: 'No incomplete tasks to carry over',
        carriedTasks: [],
        fromDate,
        toDate,
      })
    }

    // Create new tasks for the target date
    const carriedTasks: Task[] = []

    for (const task of tasksToCarry) {
      const newTask = await createTask(toDate, {
        startTime: task.startTime,
        approxEndTime: task.approxEndTime,
        description: task.description,
        priority: task.priority,
        tags: task.tags,
        notes: task.notes,
        subtasks: task.subtasks?.map(subtask => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          description: subtask.description,
          completed: false, // Reset subtask completion
        })),
      })
      carriedTasks.push(newTask)
    }

    // Delete original tasks if requested
    const deletedTaskIds: string[] = []
    if (deleteOriginals) {
      for (const task of tasksToCarry) {
        const deleted = await deleteTask(fromDate, task.id)
        if (deleted) {
          deletedTaskIds.push(task.id)
        }
      }
    }

    // Get updated state
    const updatedState = await getState()

    return NextResponse.json({
      message: `Successfully carried over ${carriedTasks.length} task(s)`,
      carriedTasks,
      fromDate,
      toDate,
      deletedFromOriginal: deleteOriginals,
      deletedTaskIds,
      updatedSourceTasks: updatedState.tasksByDate[fromDate] || [],
      updatedTargetTasks: updatedState.tasksByDate[toDate] || [],
    })
  } catch (error) {
    console.error('Error in carryover POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to get carry-over suggestions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('fromDate')

    if (!fromDate) {
      return NextResponse.json(
        { error: 'fromDate query parameter is required' },
        { status: 400 }
      )
    }

    const state = await getState()
    const sourceTasks = state.tasksByDate[fromDate] || []
    const incompleteTasks = sourceTasks.filter(task => !task.completed)

    return NextResponse.json({
      fromDate,
      incompleteTasks,
      count: incompleteTasks.length,
    })
  } catch (error) {
    console.error('Error in carryover GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
