import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/state-store'
import { exportToJSON } from '@/lib/data-export-utils'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') as 'all' | 'tasks' | 'habits' || 'all'
    const fromDate = searchParams.get('fromDate') || undefined
    const toDate = searchParams.get('toDate') || undefined

    // Validate type parameter
    if (type && !['all', 'tasks', 'habits'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Expected: all, tasks, or habits' },
        { status: 400 }
      )
    }

    // Validate date format if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (fromDate && !dateRegex.test(fromDate)) {
      return NextResponse.json(
        { error: 'Invalid fromDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }
    if (toDate && !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid toDate format. Expected YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Get state and export
    const state = await getState()
    const jsonContent = exportToJSON(state, {
      type,
      fromDate,
      toDate,
    })

    // Generate filename
    const datePart = fromDate && toDate
      ? `_${fromDate}_to_${toDate}`
      : `_${new Date().toISOString().split('T')[0]}`
    const typePart = type === 'all' ? 'data' : type
    const filename = `dailyplanner_${typePart}${datePart}.json`

    // Return JSON file with appropriate headers
    return new NextResponse(jsonContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting JSON:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
