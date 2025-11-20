"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { HabitDefinition } from "@/lib/types"
import {
  Droplets,
  Beef,
  Moon,
  Dumbbell,
  Heart,
  Star,
  Book,
  Coffee,
  Apple,
  Bike,
  Music,
  Pencil,
  Pill,
  Sun,
  Leaf,
  Flame,
  Plus,
  Trash2,
  Settings,
  X,
} from "lucide-react"

// Predefined colors for habit selection
const PREDEFINED_COLORS = [
  { name: "Sky", value: "rgb(14, 165, 233)" },
  { name: "Pink", value: "rgb(236, 72, 153)" },
  { name: "Purple", value: "rgb(167, 139, 250)" },
  { name: "Orange", value: "rgb(249, 115, 22)" },
  { name: "Green", value: "rgb(34, 197, 94)" },
  { name: "Red", value: "rgb(239, 68, 68)" },
  { name: "Yellow", value: "rgb(234, 179, 8)" },
  { name: "Teal", value: "rgb(20, 184, 166)" },
]

// Available icons for habit selection
const AVAILABLE_ICONS = [
  { name: "Droplets", component: Droplets },
  { name: "Beef", component: Beef },
  { name: "Moon", component: Moon },
  { name: "Dumbbell", component: Dumbbell },
  { name: "Heart", component: Heart },
  { name: "Star", component: Star },
  { name: "Book", component: Book },
  { name: "Coffee", component: Coffee },
  { name: "Apple", component: Apple },
  { name: "Bike", component: Bike },
  { name: "Music", component: Music },
  { name: "Pencil", component: Pencil },
  { name: "Pill", component: Pill },
  { name: "Sun", component: Sun },
  { name: "Leaf", component: Leaf },
  { name: "Flame", component: Flame },
]

// Icon component lookup
export const IconLookup: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplets,
  Beef,
  Moon,
  Dumbbell,
  Heart,
  Star,
  Book,
  Coffee,
  Apple,
  Bike,
  Music,
  Pencil,
  Pill,
  Sun,
  Leaf,
  Flame,
}

type HabitManagerProps = {
  habits: HabitDefinition[]
  onAddHabit: (habit: Omit<HabitDefinition, "id">) => Promise<void>
  onRemoveHabit: (habitId: string) => Promise<void>
  onUpdateHabit?: (habitId: string, updates: Partial<Omit<HabitDefinition, "id">>) => Promise<void>
}

export default function HabitManager({
  habits,
  onAddHabit,
  onRemoveHabit,
  onUpdateHabit,
}: HabitManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAddingHabit, setIsAddingHabit] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitDefinition | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [color, setColor] = useState(PREDEFINED_COLORS[0].value)
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0].name)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setName("")
    setColor(PREDEFINED_COLORS[0].value)
    setIcon(AVAILABLE_ICONS[0].name)
    setIsAddingHabit(false)
    setEditingHabit(null)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      if (editingHabit && onUpdateHabit) {
        await onUpdateHabit(editingHabit.id, {
          name: name.trim(),
          color,
          icon,
        })
      } else {
        await onAddHabit({
          name: name.trim(),
          color,
          icon,
        })
      }
      resetForm()
    } catch (error) {
      console.error("Failed to save habit:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (habitId: string) => {
    try {
      await onRemoveHabit(habitId)
    } catch (error) {
      console.error("Failed to delete habit:", error)
    }
  }

  const startEditing = (habit: HabitDefinition) => {
    setEditingHabit(habit)
    setName(habit.name)
    setColor(habit.color)
    setIcon(habit.icon)
    setIsAddingHabit(true)
  }

  const canAddMore = habits.length < 8

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Manage Habits
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Habits</DialogTitle>
          <DialogDescription>
            Customize your daily habits. You can have up to 8 habits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing habits list */}
          <div className="space-y-2">
            <Label>Current Habits ({habits.length}/8)</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {habits.map((habit) => {
                const IconComponent = IconLookup[habit.icon] || Star
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: habit.color }}
                      >
                        <IconComponent className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {onUpdateHabit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => startEditing(habit)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(habit.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              {habits.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No habits configured. Add your first habit below.
                </p>
              )}
            </div>
          </div>

          {/* Add/Edit habit form */}
          {isAddingHabit ? (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>{editingHabit ? "Edit Habit" : "New Habit"}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Name input */}
              <div className="space-y-2">
                <Label htmlFor="habit-name">Name</Label>
                <Input
                  id="habit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Meditation"
                  maxLength={20}
                />
              </div>

              {/* Color picker */}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all",
                        color === c.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c.value }}
                      onClick={() => setColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon selector */}
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map((ic) => {
                    const IconComp = ic.component
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        className={cn(
                          "h-8 w-8 rounded-lg border flex items-center justify-center transition-all",
                          icon === ic.name
                            ? "border-foreground bg-muted"
                            : "border-border hover:bg-muted/50"
                        )}
                        onClick={() => setIcon(ic.name)}
                        title={ic.name}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    {(() => {
                      const PreviewIcon = IconLookup[icon] || Star
                      return <PreviewIcon className="h-3.5 w-3.5 text-white" />
                    })()}
                  </div>
                  <span className="text-sm font-medium">
                    {name.trim() || "Habit Name"}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingHabit
                  ? "Save Changes"
                  : "Add Habit"}
              </Button>
            </div>
          ) : (
            canAddMore && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsAddingHabit(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Habit
              </Button>
            )
          )}

          {!canAddMore && !isAddingHabit && (
            <p className="text-sm text-muted-foreground text-center">
              Maximum of 8 habits reached. Remove a habit to add a new one.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
