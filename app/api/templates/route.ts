import { NextRequest, NextResponse } from 'next/server'
import { getTemplates, createTemplate, deleteTemplate } from '@/lib/state-store'
import type { Task } from '@/lib/types'

export const runtime = 'nodejs'

// GET - Retrieve all templates
export async function GET() {
  const templates = await getTemplates()
  return NextResponse.json({ templates })
}

// POST - Create a new template
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, task } = body as {
      name: string
      task: Omit<Task, 'id' | 'completed' | 'actualEndTime' | 'durationSeconds'>
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!task || !task.description || !task.startTime || !task.approxEndTime) {
      return NextResponse.json(
        { error: 'Invalid task data' },
        { status: 400 }
      )
    }

    const template = await createTemplate(name.trim(), task)
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const deleted = await deleteTemplate(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
