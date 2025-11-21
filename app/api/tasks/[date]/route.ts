import { NextRequest, NextResponse } from 'next/server'
import { createTask, deleteTask, getState, updateTask } from '@/lib/state-store'
import type { TaskLink } from '@/lib/types'

export const runtime = 'nodejs'

// URL validation helper
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Validate links array
function validateLinks(links: unknown): { valid: boolean; error?: string; sanitized?: TaskLink[] } {
  if (links === undefined || links === null) {
    return { valid: true, sanitized: undefined }
  }

  if (!Array.isArray(links)) {
    return { valid: false, error: 'links must be an array' }
  }

  if (links.length > 3) {
    return { valid: false, error: 'Maximum 3 links allowed per task' }
  }

  const sanitized: TaskLink[] = []
  for (const link of links) {
    if (!link || typeof link !== 'object') {
      return { valid: false, error: 'Each link must be an object' }
    }

    if (!link.url || typeof link.url !== 'string') {
      return { valid: false, error: 'Each link must have a url string' }
    }

    if (!isValidUrl(link.url)) {
      return { valid: false, error: `Invalid URL: ${link.url}` }
    }

    const title = link.title && typeof link.title === 'string' ? link.title.trim() : ''
    sanitized.push({
      url: link.url.trim(),
      title: title || new URL(link.url).hostname
    })
  }

  return { valid: true, sanitized }
}

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

    // Validate links if provided
    if (body.links !== undefined) {
      const linkValidation = validateLinks(body.links)
      if (!linkValidation.valid) {
        return NextResponse.json({ error: linkValidation.error }, { status: 400 })
      }
      body.links = linkValidation.sanitized
    }

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

    // Validate links if provided
    if (patch.links !== undefined) {
      const linkValidation = validateLinks(patch.links)
      if (!linkValidation.valid) {
        return NextResponse.json({ error: linkValidation.error }, { status: 400 })
      }
      patch.links = linkValidation.sanitized
    }

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


