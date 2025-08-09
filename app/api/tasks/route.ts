import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || undefined
  const state = await getState()
  if (date) {
    return NextResponse.json({ tasks: state.tasksByDate[date] || [] })
  }
  return NextResponse.json({ tasksByDate: state.tasksByDate })
}


