"use client"

import { useState } from "react"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ThemePickerInline } from "@/components/theme-picker"
import type { WeekStartDay } from "@/lib/settings-utils"

interface SettingsDialogProps {
  weekStartsOn: WeekStartDay
  onWeekStartsOnChange: (value: WeekStartDay) => void
}

export default function SettingsDialog({
  weekStartsOn,
  onWeekStartsOnChange,
}: SettingsDialogProps) {
  const [open, setOpen] = useState(false)

  const handleWeekStartChange = (value: string) => {
    const newValue = parseInt(value, 10) as WeekStartDay
    onWeekStartsOnChange(newValue)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your daily planner preferences
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Calendar</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="week-start" className="text-right text-sm">
                Week starts on
              </Label>
              <Select
                value={weekStartsOn.toString()}
                onValueChange={handleWeekStartChange}
              >
                <SelectTrigger id="week-start" className="col-span-3">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Appearance</h3>
            <div className="space-y-2">
              <Label className="text-sm">Color Theme</Label>
              <ThemePickerInline />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
