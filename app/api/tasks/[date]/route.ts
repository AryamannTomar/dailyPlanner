import { NextRequest, NextResponse } from 'next/server'
import { createTask, deleteTask, getState, updateTask } from '@/lib/state-store'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const state = await getState()
    return NextResponse.json({ tasks: state.tasksByDate[date] || [] })
  } catch (error) {
    console.error('Error in tasks GET:', error)
    return NextResponse.json({ error: 'Internal server error', tasks: [] }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const body = await req.json()
    const task = await createTask(date, body)
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error in tasks POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const body = await req.json()
    const { id, ...patch } = body || {}
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const updated = await updateTask(date, id, patch)
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error in tasks PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { date: string } },
) {
  try {
    const { date } = params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const ok = await deleteTask(date, id)
    return NextResponse.json({ ok })
  } catch (error) {
    console.error('Error in tasks DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


