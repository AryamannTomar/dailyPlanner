"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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
}: {
  onSave: (task: { startTime: string; approxEndTime: string; description: string; display?: any }) => void
  onCancel: () => void
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

  return (
    <form
      className="rounded-xl border p-3 sm:p-4 shadow-sm space-y-4 bg-white"
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
        onSave({
          startTime,
          approxEndTime,
          description: description.trim(),
          // display metadata for immediate rendering in the task card
          display: {
            formattedStart: formatTo12h(startTime), // "9:00 AM"
            formattedEnd: formatTo12h(approxEndTime), // "10:00 AM"
            compactEnd: true, // render smaller end-time + edit icon
          },
        } as any)
        setDescription("")
      }}
    >
      {/* Times row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start Time */}
        <div className="flex flex-col gap-1">
          <label htmlFor="start-hour" className="text-xs font-medium text-neutral-600">
            {"Start Time"}
          </label>
          <div className="flex flex-wrap items-center gap-1 rounded-md border bg-white px-2 py-1.5">
            <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <div className="flex items-center gap-1">
               <Input
                id="start-hour"
                type="text"
                inputMode="numeric"
                placeholder="hh"
                value={sHour}
                 onChange={(e) => setSHour(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md"
              />
              <span className="select-none text-xs text-neutral-500 px-0.5">:</span>
               <Input
                id="start-minute"
                type="text"
                inputMode="numeric"
                placeholder="mm"
                value={sMinute}
                 onChange={(e) => setSMinute(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md"
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
                className="h-7 px-2 text-xs border rounded-l-md data-[state=on]:bg-neutral-900 data-[state=on]:text-white"
              >
                AM
              </ToggleGroupItem>
              <ToggleGroupItem
                value="PM"
                aria-label="PM"
                className="h-7 px-2 text-xs border -ml-px rounded-r-md data-[state=on]:bg-neutral-900 data-[state=on]:text-white"
              >
                PM
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* End Time (Approx) */}
        <div className="flex flex-col gap-1">
          <label htmlFor="end-hour" className="text-xs font-medium text-neutral-600">
            {"End Time"}
          </label>
          <div className="flex flex-wrap items-center gap-1 rounded-md border bg-white px-2 py-1.5">
            <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <div className="flex items-center gap-1">
               <Input
                id="end-hour"
                type="text"
                inputMode="numeric"
                placeholder="hh"
                value={eHour}
                 onChange={(e) => setEHour(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md"
              />
              <span className="select-none text-xs text-neutral-500 px-0.5">:</span>
               <Input
                id="end-minute"
                type="text"
                inputMode="numeric"
                placeholder="mm"
                value={eMinute}
                 onChange={(e) => setEMinute(onlyDigits2(e.target.value))}
                className="w-10 h-7 px-1.5 text-center text-[11px] rounded-md"
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
                className="h-7 px-2 text-xs border rounded-l-md data-[state=on]:bg-neutral-900 data-[state=on]:text-white"
              >
                AM
              </ToggleGroupItem>
              <ToggleGroupItem
                value="PM"
                aria-label="PM"
                className="h-7 px-2 text-xs border -ml-px rounded-r-md data-[state=on]:bg-neutral-900 data-[state=on]:text-white"
              >
                PM
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Task field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="desc" className="text-xs font-medium text-neutral-600">
          {"Task"}
        </label>
        <Input
          id="desc"
          placeholder="What will you do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9 rounded-lg"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {"Cancel"}
        </Button>
        <Button type="submit" disabled={!description.trim()}>
          {"Save"}
        </Button>
      </div>
    </form>
  )
}
