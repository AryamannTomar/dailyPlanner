// Dashboard Widget Types and Utilities

export type WidgetType =
  | 'TasksToday'
  | 'HabitStreak'
  | 'WeekProgress'
  | 'Pomodoro'
  | 'Goals'
  | 'Calendar'
  | 'Notes'

export type WidgetSize = 'small' | 'medium' | 'large'

export type WidgetPosition = {
  x: number
  y: number
}

export type DashboardWidget = {
  id: string
  type: WidgetType
  position: WidgetPosition
  size: WidgetSize
  visible: boolean
  minimized: boolean
}

export type DashboardLayout = {
  widgets: DashboardWidget[]
  columns: number
}

// Widget metadata for display
export const WIDGET_METADATA: Record<WidgetType, {
  name: string
  description: string
  icon: string
  defaultSize: WidgetSize
}> = {
  TasksToday: {
    name: 'Today\'s Tasks',
    description: 'View and manage today\'s tasks',
    icon: 'CheckSquare',
    defaultSize: 'medium'
  },
  HabitStreak: {
    name: 'Habit Streaks',
    description: 'Track your habit streaks',
    icon: 'Flame',
    defaultSize: 'small'
  },
  WeekProgress: {
    name: 'Week Progress',
    description: 'Overview of weekly task completion',
    icon: 'TrendingUp',
    defaultSize: 'medium'
  },
  Pomodoro: {
    name: 'Pomodoro Timer',
    description: 'Focus timer with work/break sessions',
    icon: 'Timer',
    defaultSize: 'small'
  },
  Goals: {
    name: 'Daily Goals',
    description: 'Track daily goals progress',
    icon: 'Target',
    defaultSize: 'medium'
  },
  Calendar: {
    name: 'Mini Calendar',
    description: 'Quick calendar overview',
    icon: 'Calendar',
    defaultSize: 'medium'
  },
  Notes: {
    name: 'Quick Notes',
    description: 'Jot down quick notes',
    icon: 'StickyNote',
    defaultSize: 'medium'
  }
}

// Size dimensions for grid layout
export const WIDGET_SIZE_CONFIG: Record<WidgetSize, { cols: number; rows: number }> = {
  small: { cols: 1, rows: 1 },
  medium: { cols: 2, rows: 2 },
  large: { cols: 3, rows: 2 }
}

// Default layout configuration
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  columns: 4,
  widgets: [
    {
      id: 'widget-tasks-today',
      type: 'TasksToday',
      position: { x: 0, y: 0 },
      size: 'medium',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-week-progress',
      type: 'WeekProgress',
      position: { x: 2, y: 0 },
      size: 'medium',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-habit-streak',
      type: 'HabitStreak',
      position: { x: 0, y: 2 },
      size: 'small',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-pomodoro',
      type: 'Pomodoro',
      position: { x: 1, y: 2 },
      size: 'small',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-goals',
      type: 'Goals',
      position: { x: 2, y: 2 },
      size: 'medium',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-calendar',
      type: 'Calendar',
      position: { x: 0, y: 3 },
      size: 'medium',
      visible: true,
      minimized: false
    },
    {
      id: 'widget-notes',
      type: 'Notes',
      position: { x: 2, y: 3 },
      size: 'medium',
      visible: true,
      minimized: false
    }
  ]
}

const DASHBOARD_LAYOUT_KEY = 'dailyPlanner_dashboardLayout'

// Save layout to localStorage
export function saveDashboardLayout(layout: DashboardLayout): void {
  try {
    localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout))
  } catch (error) {
    console.error('Failed to save dashboard layout:', error)
  }
}

// Load layout from localStorage
export function loadDashboardLayout(): DashboardLayout {
  try {
    const saved = localStorage.getItem(DASHBOARD_LAYOUT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as DashboardLayout
      // Validate and merge with defaults to ensure all widget types exist
      return validateAndMergeLayout(parsed)
    }
  } catch (error) {
    console.error('Failed to load dashboard layout:', error)
  }
  return { ...DEFAULT_DASHBOARD_LAYOUT }
}

// Validate and merge layout with defaults
function validateAndMergeLayout(layout: DashboardLayout): DashboardLayout {
  const validatedWidgets: DashboardWidget[] = []
  const existingTypes = new Set<WidgetType>()

  // Keep valid existing widgets
  for (const widget of layout.widgets) {
    if (
      widget.id &&
      widget.type &&
      WIDGET_METADATA[widget.type] &&
      widget.position &&
      typeof widget.position.x === 'number' &&
      typeof widget.position.y === 'number' &&
      widget.size &&
      ['small', 'medium', 'large'].includes(widget.size)
    ) {
      validatedWidgets.push({
        ...widget,
        visible: widget.visible ?? true,
        minimized: widget.minimized ?? false
      })
      existingTypes.add(widget.type)
    }
  }

  // Add any missing widget types from defaults
  for (const defaultWidget of DEFAULT_DASHBOARD_LAYOUT.widgets) {
    if (!existingTypes.has(defaultWidget.type)) {
      validatedWidgets.push({ ...defaultWidget, visible: false })
    }
  }

  return {
    columns: layout.columns || DEFAULT_DASHBOARD_LAYOUT.columns,
    widgets: validatedWidgets
  }
}

// Reset layout to default
export function resetDashboardLayout(): DashboardLayout {
  const layout = { ...DEFAULT_DASHBOARD_LAYOUT }
  saveDashboardLayout(layout)
  return layout
}

// Update widget position
export function updateWidgetPosition(
  layout: DashboardLayout,
  widgetId: string,
  newPosition: WidgetPosition
): DashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, position: newPosition }
        : widget
    )
  }
}

// Update widget size
export function updateWidgetSize(
  layout: DashboardLayout,
  widgetId: string,
  newSize: WidgetSize
): DashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, size: newSize }
        : widget
    )
  }
}

// Toggle widget visibility
export function toggleWidgetVisibility(
  layout: DashboardLayout,
  widgetId: string
): DashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    )
  }
}

// Toggle widget minimized state
export function toggleWidgetMinimized(
  layout: DashboardLayout,
  widgetId: string
): DashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map(widget =>
      widget.id === widgetId
        ? { ...widget, minimized: !widget.minimized }
        : widget
    )
  }
}

// Get visible widgets sorted by position
export function getVisibleWidgets(layout: DashboardLayout): DashboardWidget[] {
  return layout.widgets
    .filter(widget => widget.visible)
    .sort((a, b) => {
      // Sort by y position first, then x position
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y
      }
      return a.position.x - b.position.x
    })
}

// Generate unique widget ID
export function generateWidgetId(type: WidgetType): string {
  return `widget-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Get CSS grid styles for widget
export function getWidgetGridStyles(widget: DashboardWidget): React.CSSProperties {
  const sizeConfig = WIDGET_SIZE_CONFIG[widget.size]
  return {
    gridColumn: `span ${sizeConfig.cols}`,
    gridRow: `span ${sizeConfig.rows}`
  }
}

// Dashboard view mode
export type DashboardViewMode = 'standard' | 'dashboard'

const VIEW_MODE_KEY = 'dailyPlanner_viewMode'

export function saveViewMode(mode: DashboardViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode)
  } catch (error) {
    console.error('Failed to save view mode:', error)
  }
}

export function loadViewMode(): DashboardViewMode {
  try {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    if (saved === 'standard' || saved === 'dashboard') {
      return saved
    }
  } catch (error) {
    console.error('Failed to load view mode:', error)
  }
  return 'standard'
}

// Quick notes storage
const QUICK_NOTES_KEY = 'dailyPlanner_quickNotes'

export function saveQuickNotes(notes: string): void {
  try {
    localStorage.setItem(QUICK_NOTES_KEY, notes)
  } catch (error) {
    console.error('Failed to save quick notes:', error)
  }
}

export function loadQuickNotes(): string {
  try {
    return localStorage.getItem(QUICK_NOTES_KEY) || ''
  } catch (error) {
    console.error('Failed to load quick notes:', error)
    return ''
  }
}
