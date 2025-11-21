"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Clock, StickyNote, ChevronDown, ChevronUp, Link2, ListChecks, Plus, Trash2, Repeat, FileText, Calendar, CalendarRange } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { TaskPriority, TaskLink, Subtask, RecurrencePattern, TaskTemplate } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import TagInput from "@/components/tag-input"
import LinkInput from "@/components/link-input"

function to12hParts(time: string): { hh: string; mm: string; period: "AM" | "PM" } {
  const [hStr = "0", mStr = "0"] = (time || "").split(":")
  let h = Number.parseInt(hStr || "0", 10)
  const m = Math.max(0, Math.min(59, Number.parseInt(mStr || "0", 10)))
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return { hh: String(h).padStart(2, "0"), mm: String(m).padStart(2, "0"), period }
}

function to24h(hh12: string, mm: string, period: "AM" | "PM"): string {
  let h = Number.parseInt(hh12 || "12", 10)
  let m = Number.parseInt(mm || "0", 10)
  if (isNaN(h) || h < 1) h = 12
  if (h > 12) h = 12
  if (isNaN(m) || m < 0) m = 0
  if (m > 59) m = 59
  let h24 = h % 12
  if (period === "PM") h24 += 12
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function formatTo12h(time24: string) {
  const [hStr = "00", mStr = "00"] = (time24 || "").split(":")
  let h = Number.parseInt(hStr, 10)
  const m = mStr.padStart(2, "0")
  const period = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return `${String(h)}:${m} ${period}`
}

export default function AddTaskForm({
  onSave,
  onCancel,
  templates = [],
  currentDate,
}: {
  onSave: (task: { startTime: string; approxEndTime: string; description: string; priority?: TaskPriority; notes?: string | null; tags?: string[]; links?: TaskLink[]; subtasks?: Subtask[]; recurrence?: RecurrencePattern; endDate?: string; display?: any }) => void
  onCancel: () => void
  templates?: TaskTemplate[]
  currentDate?: string // ISO date string for the current day being edited
}) {
  // Initialize form to 9:00 AM -> 10:00 AM
  const sInit = to12hParts("09:00")
  const eInit = to12hParts("10:00")

  const [sHour, setSHour] = useState<string>(sInit.hh)
  const [sMinute, setSMinute] = useState<string>(sInit.mm)
  const [sPeriod, setSPeriod] = useState<"AM" | "PM">(sInit.period)

  const [eHour, setEHour] = useState<string>(eInit.hh)
  const [eMinute, setEMinute] = useState<string>(eInit.mm)
  const [ePeriod, setEPeriod] = useState<"AM" | "PM">(eInit.period)

  const [description, setDescription] = useState<string>("")
  const [priority, setPriority] = useState<TaskPriority>(null)
  const [notes, setNotes] = useState<string>("")
  const [notesOpen, setNotesOpen] = useState<boolean>(false)
  const [tags, setTags] = useState<string[]>([])
  const [links, setLinks] = useState<TaskLink[]>([])
  const [linksOpen, setLinksOpen] = useState<boolean>(false)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [subtasksOpen, setSubtasksOpen] = useState<boolean>(false)
  const [newSubtaskText, setNewSubtaskText] = useState<string>("")

  // Recurrence state
  const [recurrenceOpen, setRecurrenceOpen] = useState<boolean>(false)
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"daily" | "weekly" | "monthly">("daily")
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("")
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>([])

  // Multi-day task state
  const [multiDayOpen, setMultiDayOpen] = useState<boolean>(false)
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false)
  const [taskEndDate, setTaskEndDate] = useState<string>("")

  const MAX_NOTES_LENGTH = 500

  // Calculate number of days for multi-day task
  const getMultiDayCount = () => {
    if (!isMultiDay || !taskEndDate || !currentDate) return 0
    const start = new Date(currentDate)
    const end = new Date(taskEndDate)
    if (end <= start) return 0
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const addSubtask = () => {
    if (newSubtaskText.trim()) {
      const newSubtask: Subtask = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        description: newSubtaskText.trim(),
        completed: false,
      }
      setSubtasks([...subtasks, newSubtask])
      setNewSubtaskText("")
    }
  }

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((s) => s.id !== id))
  }

  function onlyDigits2(v: string) {
    return v.replace(/[^0-9]/g, "").slice(0, 2)
  }
  function clampHour(v: string) {
    // Do not clamp while typing; just return cleaned string
    if (!v) return v
    let n = Number.parseInt(v, 10)
    if (isNaN(n)) return ""
    return String(n).slice(0, 2)
  }
  function clampMinute(v: string) {
    if (!v) return v
    let n = Number.parseInt(v, 10)
    if (isNaN(n)) return ""
    return String(n).slice(0, 2)
  }

  // Function to fill form from template
  const fillFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    const task = template.task

    // Fill time fields
    const startParts = to12hParts(task.startTime)
    setSHour(startParts.hh)
    setSMinute(startParts.mm)
    setSPeriod(startParts.period)

    const endParts = to12hParts(task.approxEndTime)
    setEHour(endParts.hh)
    setEMinute(endParts.mm)
    setEPeriod(endParts.period)

    // Fill other fields
    setDescription(task.description)
    setPriority(task.priority || null)
    setNotes(task.notes || "")
    setTags(task.tags || [])
    setLinks(task.links || [])
    setSubtasks(task.subtasks ? task.subtasks.map(s => ({
      ...s,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      completed: false,
    })) : [])

    // Expand sections if they have content
    if (task.notes) setNotesOpen(true)
    if (task.links && task.links.length > 0) setLinksOpen(true)
    if (task.subtasks && task.subtasks.length > 0) setSubtasksOpen(true)
  }

  return (
    <form
      className="rounded-xl border p-3 sm:p-4 shadow-sm space-y-4 bg-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!description.trim()) return
         // Validate once on submit for smoother typing
         const sH = Number.parseInt(sHour || "12", 10)
         const sM = Number.parseInt(sMinute || "0", 10)
         const eH = Number.parseInt(eHour || "12", 10)
         const eM = Number.parseInt(eMinute || "0", 10)
         const invalid =
           isNaN(sH) || sH < 1 || sH > 12 ||
           isNaN(sM) || sM < 0 || sM > 59 ||
           isNaN(eH) || eH < 1 || eH > 12 ||
           isNaN(eM) || eM < 0 || eM > 59
         if (invalid) {
           alert("Please enter a valid time (hh between 1-12, mm between 00-59).")
           return
         }
         const startTime = to24h(String(sH), String(sM), sPeriod)
         const approxEndTime = to24h(String(eH), String(eM), ePeriod)
        // Build recurrence pattern if enabled
        let recurrence: RecurrencePattern | undefined = undefined
        if (isRecurring) {
          recurrence = {
            frequency: recurrenceFrequency,
            interval: recurrenceInterval,
            ...(recurrenceEndDate ? { endDate: recurrenceEndDate } : {}),
            ...(recurrenceFrequency === 'weekly' && recurrenceDaysOfWeek.length > 0
              ? { daysOfWeek: recurrenceDaysOfWeek }
              : {}),
          }
        }

        onSave({
          startTime,
          approxEndTime,
          description: description.trim(),
          priority,
          notes: notes.trim() || null,
          tags: tags.length > 0 ? tags : undefined,
          links: links.length > 0 ? links : undefined,
          subtasks: subtasks.length > 0 ? subtasks : undefined,
          recurrence,
          endDate: isMultiDay && taskEndDate && taskEndDate > (currentDate || '') ? taskEndDate : undefined,
          // display metadata for immediate rendering in the task card
          display: {
            formattedStart: formatTo12h(startTime), // "9:00 AM"
            formattedEnd: formatTo12h(approxEndTime), // "10:00 AM"
            compactEnd: true, // render smaller end-time + edit icon
          },
        } as any)
        setDescription("")
        setPriority(null)
        setNotes("")
        setNotesOpen(false)
        setTags([])
        setLinks([])
        setLinksOpen(false)
        setSubtasks([])
        setSubtasksOpen(false)
        setNewSubtaskText("")
        // Reset recurrence state
        setRecurrenceOpen(false)
        setIsRecurring(false)
        setRecurrenceFrequency("daily")
        setRecurrenceInterval(1)
        setRecurrenceEndDate("")
        setRecurrenceDaysOfWeek([])
        // Reset multi-day state
        setMultiDayOpen(false)
        setIsMultiDay(false)
        setTaskEndDate("")
      }}
    >
      {/* Template selector */}
      {templates.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="template" className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Use Template
          </label>
          <Select
            value=""
            onValueChange={(value) => {
              if (value) {
                fillFromTemplate(value)
              }
            }}
          >
            <SelectTrigger id="template" className="h-9 rounded-lg bg-background">
              <SelectValue placeholder="Select a template to fill form..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Times row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start Time */}
        <div className="flex flex-col gap-1">
          <label htmlFor="start-hour" className="text-xs font-medium text-foreground">
            {"Start Time"}
          </label>
          <div className="flex flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <div className="flex items-center gap-1">
               <Input
                id="start-hour"
                type="text"
                inputMode="numeric"
                placeholder="hh"
                value={sHour}
                 onChange={(e) => setSHour(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md bg-background border-0 focus-visible:ring-1"
              />
              <span className="select-none text-xs text-muted-foreground px-0.5">:</span>
               <Input
                id="start-minute"
                type="text"
                inputMode="numeric"
                placeholder="mm"
                value={sMinute}
                 onChange={(e) => setSMinute(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md bg-background border-0 focus-visible:ring-1"
              />
            </div>
            <ToggleGroup
              type="single"
              value={sPeriod}
              onValueChange={(v) => v && setSPeriod(v as "AM" | "PM")}
              className="h-7"
            >
              <ToggleGroupItem
                value="AM"
                aria-label="AM"
                className="h-7 px-2 text-xs border rounded-l-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-background data-[state=off]:text-foreground"
              >
                AM
              </ToggleGroupItem>
              <ToggleGroupItem
                value="PM"
                aria-label="PM"
                className="h-7 px-2 text-xs border -ml-px rounded-r-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-background data-[state=off]:text-foreground"
              >
                PM
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* End Time (Approx) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="end-hour" className="text-xs font-medium text-foreground">
            {"End Time"}
          </label>
          <div className="flex flex-wrap items-center gap-1 rounded-md border bg-background px-2 py-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <div className="flex items-center gap-1">
               <Input
                id="end-hour"
                type="text"
                inputMode="numeric"
                placeholder="hh"
                value={eHour}
                 onChange={(e) => setEHour(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md bg-background border-0 focus-visible:ring-1"
              />
              <span className="select-none text-xs text-muted-foreground px-0.5">:</span>
               <Input
                id="end-minute"
                type="text"
                inputMode="numeric"
                placeholder="mm"
                value={eMinute}
                 onChange={(e) => setEMinute(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md bg-background border-0 focus-visible:ring-1"
              />
            </div>
            <ToggleGroup
              type="single"
              value={ePeriod}
              onValueChange={(v) => v && setEPeriod(v as "AM" | "PM")}
              className="h-7"
            >
              <ToggleGroupItem
                value="AM"
                aria-label="AM"
                className="h-7 px-2 text-xs border rounded-l-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-background data-[state=off]:text-foreground"
              >
                AM
              </ToggleGroupItem>
              <ToggleGroupItem
                value="PM"
                aria-label="PM"
                className="h-7 px-2 text-xs border -ml-px rounded-r-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:bg-background data-[state=off]:text-foreground"
              >
                PM
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Priority and Task row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Priority selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="priority" className="text-xs font-medium text-foreground">
            {"Priority"}
          </label>
          <Select
            value={priority || "none"}
            onValueChange={(value) => setPriority(value === "none" ? null : (value as "high" | "medium" | "low"))}
          >
            <SelectTrigger id="priority" className="h-9 rounded-lg bg-background">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="desc" className="text-xs font-medium text-foreground">
            {"Task"}
          </label>
          <Input
            id="desc"
            placeholder="What will you do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9 rounded-lg bg-background"
          />
        </div>
      </div>

      {/* Tags */}
      <TagInput tags={tags} onChange={setTags} />

      {/* Links section */}
      <Collapsible open={linksOpen} onOpenChange={setLinksOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <Link2 className="h-3.5 w-3.5" />
            {linksOpen ? "Hide links" : "Add links"}
            {links.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {links.length}
              </span>
            )}
            {linksOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <LinkInput links={links} onChange={setLinks} />
        </CollapsibleContent>
      </Collapsible>

      {/* Subtasks section */}
      <Collapsible open={subtasksOpen} onOpenChange={setSubtasksOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {subtasksOpen ? "Hide subtasks" : "Add subtasks"}
            {subtasks.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {subtasks.length}
              </span>
            )}
            {subtasksOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-2">
            {/* Existing subtasks */}
            {subtasks.length > 0 && (
              <ul className="space-y-1">
                {subtasks.map((subtask) => (
                  <li
                    key={subtask.id}
                    className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/50"
                  >
                    <ListChecks className="h-3 w-3 text-muted-foreground" />
                    <span className="flex-1 text-xs text-foreground">{subtask.description}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubtask(subtask.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Remove subtask</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {/* Add new subtask */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add a subtask..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addSubtask()
                  }
                }}
                className="h-7 text-xs flex-1 bg-background"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubtask}
                disabled={!newSubtaskText.trim()}
                className="h-7 px-2 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">Add subtask</span>
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Recurrence section */}
      <Collapsible open={recurrenceOpen} onOpenChange={setRecurrenceOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <Repeat className="h-3.5 w-3.5" />
            {recurrenceOpen ? "Hide recurrence" : "Make recurring"}
            {isRecurring && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                On
              </span>
            )}
            {recurrenceOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            {/* Toggle for recurring */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(Boolean(checked))}
              />
              <label htmlFor="is-recurring" className="text-sm font-medium cursor-pointer">
                Enable recurrence
              </label>
            </div>

            {isRecurring && (
              <>
                {/* Frequency selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">Frequency</label>
                  <Select
                    value={recurrenceFrequency}
                    onValueChange={(value) => setRecurrenceFrequency(value as "daily" | "weekly" | "monthly")}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Interval input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Every {recurrenceInterval}{" "}
                    {recurrenceFrequency === "daily"
                      ? recurrenceInterval === 1 ? "day" : "days"
                      : recurrenceFrequency === "weekly"
                      ? recurrenceInterval === 1 ? "week" : "weeks"
                      : recurrenceInterval === 1 ? "month" : "months"}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={recurrenceInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val >= 1 && val <= 99) {
                        setRecurrenceInterval(val)
                      }
                    }}
                    className="h-8 text-xs bg-background w-20"
                  />
                </div>

                {/* Days of week selector for weekly */}
                {recurrenceFrequency === "weekly" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-foreground">Days of week</label>
                    <div className="flex flex-wrap gap-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                        <Button
                          key={day}
                          type="button"
                          variant={recurrenceDaysOfWeek.includes(index) ? "default" : "outline"}
                          size="sm"
                          className="h-7 px-2 text-xs cursor-pointer"
                          onClick={() => {
                            setRecurrenceDaysOfWeek((prev) =>
                              prev.includes(index)
                                ? prev.filter((d) => d !== index)
                                : [...prev, index].sort((a, b) => a - b)
                            )
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* End date picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground">End date (optional)</label>
                  <Input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className="h-8 text-xs bg-background w-40"
                  />
                  {recurrenceEndDate && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecurrenceEndDate("")}
                      className="h-6 px-2 text-xs w-fit cursor-pointer"
                    >
                      Clear end date
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Multi-day task section */}
      <Collapsible open={multiDayOpen} onOpenChange={setMultiDayOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {multiDayOpen ? "Hide multi-day" : "Multi-day task"}
            {isMultiDay && taskEndDate && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {getMultiDayCount()} days
              </span>
            )}
            {multiDayOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
            {/* Toggle for multi-day */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-multiday"
                checked={isMultiDay}
                onCheckedChange={(checked) => setIsMultiDay(Boolean(checked))}
              />
              <label htmlFor="is-multiday" className="text-sm font-medium cursor-pointer">
                Enable multi-day span
              </label>
            </div>

            {isMultiDay && (
              <>
                {/* End date picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    End date
                  </label>
                  <Input
                    type="date"
                    value={taskEndDate}
                    min={currentDate || undefined}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    className="h-8 text-xs bg-background w-40"
                  />
                </div>

                {/* Date range display */}
                {taskEndDate && currentDate && taskEndDate > currentDate && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <CalendarRange className="h-4 w-4 text-primary" />
                    <div className="text-xs">
                      <span className="font-medium text-primary">
                        {getMultiDayCount()} day{getMultiDayCount() !== 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        from {new Date(currentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} to{' '}
                        {new Date(taskEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )}

                {taskEndDate && currentDate && taskEndDate <= currentDate && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    End date must be after the start date
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Notes section */}
      <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <StickyNote className="h-3.5 w-3.5" />
            {notesOpen ? "Hide notes" : "Add notes"}
            {notesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="flex flex-col gap-1.5">
            <Textarea
              placeholder="Add additional notes for this task..."
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= MAX_NOTES_LENGTH) {
                  setNotes(e.target.value)
                }
              }}
              className="min-h-[80px] text-sm bg-background resize-none"
              maxLength={MAX_NOTES_LENGTH}
            />
            <div className="text-xs text-muted-foreground text-right">
              {notes.length}/{MAX_NOTES_LENGTH}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="text-foreground cursor-pointer">
          {"Cancel"}
        </Button>
        <Button type="submit" disabled={!description.trim()} className="cursor-pointer">
          {"Save"}
        </Button>
      </div>
    </form>
  )
}
