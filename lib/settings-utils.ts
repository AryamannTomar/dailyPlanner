// App settings types and utilities

export type WeekStartDay = 0 | 1 // 0 = Sunday, 1 = Monday

export interface AppSettings {
  weekStartsOn: WeekStartDay
}

const DEFAULT_SETTINGS: AppSettings = {
  weekStartsOn: 1, // Default to Monday
}

const STORAGE_KEY = "dailyPlannerSettings"

export function getSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      }
    }
  } catch (error) {
    console.error("Failed to load settings:", error)
  }

  return DEFAULT_SETTINGS
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS
  }

  try {
    const current = getSettings()
    const updated = {
      ...current,
      ...settings,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (error) {
    console.error("Failed to save settings:", error)
    return getSettings()
  }
}

export function getWeekStartsOn(): WeekStartDay {
  return getSettings().weekStartsOn
}

export function setWeekStartsOn(weekStartsOn: WeekStartDay): void {
  saveSettings({ weekStartsOn })
}
