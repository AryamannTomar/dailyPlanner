import { NextRequest, NextResponse } from 'next/server'
import { getState, updateCategory } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  const { date } = params
  const state = await getState()
  return NextResponse.json({ categories: state.categoriesByDate[date] || { water: false, meat: false, sleep: false, gym: false } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { date: string } },
) {
  const { date } = params
  const body = await req.json()
  const { key, value } = body || {}
  if (!key || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'key and boolean value required' }, { status: 400 })
  }
  const result = await updateCategory(date, key, value)
  return NextResponse.json(result)
}


