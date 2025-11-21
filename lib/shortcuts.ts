// Keyboard shortcuts configuration for the Daily Planner app

export type ShortcutModifier = "ctrl" | "shift" | "alt" | "meta"

export type ShortcutKey = {
  key: string // The main key (e.g., "n", "Escape", "1")
  modifiers?: ShortcutModifier[] // Optional modifier keys
}

export type Shortcut = {
  id: string
  keys: ShortcutKey[] // Array to support sequences like ["g", "t"]
  label: string
  description: string
  category: ShortcutCategory
  // If true, the shortcut should work even when focus is in an input
  global?: boolean
}

export type ShortcutCategory =
  | "navigation"
  | "tasks"
  | "habits"
  | "dialogs"
  | "general"

export const SHORTCUT_CATEGORIES: Record<ShortcutCategory, { label: string; order: number }> = {
  navigation: { label: "Navigation", order: 1 },
  tasks: { label: "Tasks", order: 2 },
  habits: { label: "Habits", order: 3 },
  dialogs: { label: "Dialogs", order: 4 },
  general: { label: "General", order: 5 },
}

export const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    id: "go-today",
    keys: [{ key: "t" }],
    label: "Go to today",
    description: "Navigate to today's date",
    category: "navigation",
  },
  {
    id: "go-today-sequence",
    keys: [{ key: "g" }, { key: "t" }],
    label: "Go to today",
    description: "Navigate to today's date (sequence)",
    category: "navigation",
  },
  {
    id: "prev-day",
    keys: [{ key: "j" }],
    label: "Previous week",
    description: "Navigate to the previous week",
    category: "navigation",
  },
  {
    id: "next-day",
    keys: [{ key: "k" }],
    label: "Next week",
    description: "Navigate to the next week",
    category: "navigation",
  },
  {
    id: "prev-week-arrow",
    keys: [{ key: "ArrowLeft", modifiers: ["alt"] }],
    label: "Previous week",
    description: "Navigate to the previous week",
    category: "navigation",
  },
  {
    id: "next-week-arrow",
    keys: [{ key: "ArrowRight", modifiers: ["alt"] }],
    label: "Next week",
    description: "Navigate to the next week",
    category: "navigation",
  },

  // Tasks
  {
    id: "new-task",
    keys: [{ key: "n" }],
    label: "New task",
    description: "Open add task form for today",
    category: "tasks",
  },
  {
    id: "save-form",
    keys: [{ key: "s", modifiers: ["ctrl"] }],
    label: "Save",
    description: "Save current form (when in form)",
    category: "tasks",
    global: true,
  },
  {
    id: "save-form-meta",
    keys: [{ key: "s", modifiers: ["meta"] }],
    label: "Save",
    description: "Save current form (when in form)",
    category: "tasks",
    global: true,
  },

  // Habits
  {
    id: "toggle-habit-1",
    keys: [{ key: "1" }],
    label: "Toggle habit 1",
    description: "Toggle the first habit for today",
    category: "habits",
  },
  {
    id: "toggle-habit-2",
    keys: [{ key: "2" }],
    label: "Toggle habit 2",
    description: "Toggle the second habit for today",
    category: "habits",
  },
  {
    id: "toggle-habit-3",
    keys: [{ key: "3" }],
    label: "Toggle habit 3",
    description: "Toggle the third habit for today",
    category: "habits",
  },
  {
    id: "toggle-habit-4",
    keys: [{ key: "4" }],
    label: "Toggle habit 4",
    description: "Toggle the fourth habit for today",
    category: "habits",
  },

  // Dialogs
  {
    id: "close-dialog",
    keys: [{ key: "Escape" }],
    label: "Close",
    description: "Close current modal/dialog",
    category: "dialogs",
    global: true,
  },
  {
    id: "show-help",
    keys: [{ key: "?" }],
    label: "Show shortcuts",
    description: "Show keyboard shortcuts help",
    category: "dialogs",
  },

  // General
  {
    id: "focus-search",
    keys: [{ key: "f" }],
    label: "Focus search",
    description: "Focus the date search input",
    category: "general",
  },
  {
    id: "focus-search-slash",
    keys: [{ key: "/" }],
    label: "Focus search",
    description: "Focus the date search input",
    category: "general",
  },
]

// Helper to format shortcut keys for display
export function formatShortcutKeys(shortcut: Shortcut): string {
  return shortcut.keys
    .map((keyDef) => {
      const parts: string[] = []

      if (keyDef.modifiers) {
        keyDef.modifiers.forEach((mod) => {
          switch (mod) {
            case "ctrl":
              parts.push("Ctrl")
              break
            case "shift":
              parts.push("Shift")
              break
            case "alt":
              parts.push("Alt")
              break
            case "meta":
              // Show Cmd on Mac, Ctrl on Windows/Linux
              parts.push(typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "Cmd" : "Ctrl")
              break
          }
        })
      }

      // Format special keys
      let keyDisplay = keyDef.key
      switch (keyDef.key) {
        case "ArrowLeft":
          keyDisplay = "Left"
          break
        case "ArrowRight":
          keyDisplay = "Right"
          break
        case "ArrowUp":
          keyDisplay = "Up"
          break
        case "ArrowDown":
          keyDisplay = "Down"
          break
        case "Escape":
          keyDisplay = "Esc"
          break
        case " ":
          keyDisplay = "Space"
          break
        default:
          keyDisplay = keyDef.key.toUpperCase()
      }

      parts.push(keyDisplay)
      return parts.join("+")
    })
    .join(" then ")
}

// Get shortcut by ID
export function getShortcutById(id: string): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.id === id)
}

// Get shortcuts by category
export function getShortcutsByCategory(category: ShortcutCategory): Shortcut[] {
  return SHORTCUTS.filter((s) => s.category === category)
}

// Get all categories with their shortcuts
export function getGroupedShortcuts(): Array<{ category: ShortcutCategory; label: string; shortcuts: Shortcut[] }> {
  const categories = Object.entries(SHORTCUT_CATEGORIES)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, value]) => ({
      category: key as ShortcutCategory,
      label: value.label,
      shortcuts: getShortcutsByCategory(key as ShortcutCategory),
    }))
    .filter((group) => group.shortcuts.length > 0)

  // Remove duplicate shortcuts (like go-today and go-today-sequence)
  return categories.map((group) => {
    const uniqueShortcuts: Shortcut[] = []
    const seenLabels = new Set<string>()

    for (const shortcut of group.shortcuts) {
      if (!seenLabels.has(shortcut.label)) {
        uniqueShortcuts.push(shortcut)
        seenLabels.add(shortcut.label)
      }
    }

    return {
      ...group,
      shortcuts: uniqueShortcuts,
    }
  })
}
