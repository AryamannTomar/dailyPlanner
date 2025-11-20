import { NextRequest, NextResponse } from 'next/server'
import { getState, saveState } from '@/lib/state-store'
import {
  validateImportData,
  mergeImportData,
  type ImportData,
  type MergeStrategy,
  type ImportType,
  type ImportSummary,
} from '@/lib/data-import-utils'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, type, mergeStrategy } = body as {
      data: ImportData
      type: ImportType
      mergeStrategy: MergeStrategy
    }

    // Validate input
    if (!data) {
      return NextResponse.json(
        { error: 'Missing import data' },
        { status: 400 }
      )
    }

    if (!mergeStrategy || !['replace', 'merge_keep', 'merge_overwrite'].includes(mergeStrategy)) {
      return NextResponse.json(
        { error: 'Invalid merge strategy' },
        { status: 400 }
      )
    }

    // Re-validate import data on server side
    const validationResult = validateImportData(data)
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      )
    }

    // Get current state
    const currentState = await getState()

    // Prepare existing data
    const existingData: ImportData = {
      tasksByDate: currentState.tasksByDate,
      categoriesByDate: currentState.categoriesByDate,
      habits: currentState.habits,
      templates: currentState.templates,
    }

    // Merge data
    const { merged, summary } = mergeImportData(existingData, data, mergeStrategy)

    // Update state
    const newState = {
      ...currentState,
      tasksByDate: merged.tasksByDate || {},
      categoriesByDate: merged.categoriesByDate || {},
      habits: merged.habits || currentState.habits,
      templates: merged.templates || currentState.templates,
    }

    // Ensure all tasks have IDs
    for (const date in newState.tasksByDate) {
      newState.tasksByDate[date] = newState.tasksByDate[date].map(task => ({
        ...task,
        id: task.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }))
    }

    // Save updated state
    await saveState(newState)

    // Return success with summary
    return NextResponse.json({
      success: true,
      summary,
      message: `Import completed: ${summary.tasksAdded} tasks added, ${summary.tasksUpdated} updated, ${summary.tasksSkipped} skipped`,
    })
  } catch (error) {
    console.error('Import failed:', error)
    return NextResponse.json(
      {
        error: 'Import failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve import templates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'

  if (format === 'json') {
    const template: ImportData = {
      tasksByDate: {
        '2025-01-15': [
          {
            id: 'sample-1',
            startTime: '09:00',
            approxEndTime: '10:00',
            description: 'Morning standup',
            completed: false,
            priority: 'high',
            tags: ['work', 'meeting'],
            notes: 'Daily team sync',
          },
        ],
      },
      habits: [
        {
          id: 'sample-habit-1',
          name: 'Water',
          color: 'rgb(14, 165, 233)',
          icon: 'Droplets',
          goal: 8,
        },
      ],
    }

    return NextResponse.json(template)
  }

  if (format === 'csv_tasks') {
    const csv = `date,startTime,approxEndTime,description,priority,completed,tags,notes
2025-01-15,09:00,10:00,Morning standup,high,false,work;meeting,Daily team sync
2025-01-15,10:30,12:00,Project work,medium,false,work,Focus time for coding`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="tasks-template.csv"',
      },
    })
  }

  if (format === 'csv_habits') {
    const csv = `name,color,icon,goal
Water,rgb(14 165 233),Droplets,8
Exercise,rgb(249 115 22),Dumbbell,
Reading,rgb(167 139 250),Book,30`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="habits-template.csv"',
      },
    })
  }

  return NextResponse.json(
    { error: 'Invalid format parameter' },
    { status: 400 }
  )
}
