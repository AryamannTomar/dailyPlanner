import { NextRequest, NextResponse } from 'next/server'
import { getState, updateCategory } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const state = await getState()
    return NextResponse.json({ categories: state.categoriesByDate[date] || { water: false, meat: false, sleep: false, gym: false } })
  } catch (error) {
    console.error('Error in categories GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', categories: { water: false, meat: false, sleep: false, gym: false } },
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
    const { key, value } = body || {}
    if (!key || typeof value !== 'boolean') {
      return NextResponse.json({ error: 'key and boolean value required' }, { status: 400 })
    }
    const result = await updateCategory(date, key, value)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in categories PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


