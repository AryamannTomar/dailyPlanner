"use client"

import { useState, useMemo, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Printer, Eye } from "lucide-react"
import { PrintView, type PrintViewType } from "@/components/print-view"
import { formatISODate, getStartOfWeek, getWeekDates, startOfMonth, endOfMonth, addDays } from "@/lib/date-utils"
import type { TasksByDate, CategoriesByDate, HabitDefinition } from "@/lib/types"

interface PrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasksByDate: TasksByDate
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  selectedDate: Date
}

export function PrintDialog({
  open,
  onOpenChange,
  tasksByDate,
  categoriesByDate,
  habits,
  selectedDate,
}: PrintDialogProps) {
  const [viewType, setViewType] = useState<PrintViewType>("daily")
  const [startDate, setStartDate] = useState<string>(formatISODate(selectedDate))
  const [endDate, setEndDate] = useState<string>(formatISODate(selectedDate))
  const [includeCompleted, setIncludeCompleted] = useState<boolean>(true)
  const [includeNotes, setIncludeNotes] = useState<boolean>(true)
  const [companyName, setCompanyName] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [showPreview, setShowPreview] = useState<boolean>(false)

  const printContentRef = useRef<HTMLDivElement>(null)

  // Update date range when view type changes
  const handleViewTypeChange = (type: PrintViewType) => {
    setViewType(type)
    const baseDate = new Date(startDate + "T00:00:00")

    switch (type) {
      case "daily":
        setEndDate(startDate)
        break
      case "weekly":
        const weekStart = getStartOfWeek(baseDate)
        const weekEnd = addDays(weekStart, 6)
        setStartDate(formatISODate(weekStart))
        setEndDate(formatISODate(weekEnd))
        break
      case "monthly":
        const monthStart = startOfMonth(baseDate)
        const monthEnd = endOfMonth(baseDate)
        setStartDate(formatISODate(monthStart))
        setEndDate(formatISODate(monthEnd))
        break
    }
  }

  const parsedStartDate = useMemo(() => new Date(startDate + "T00:00:00"), [startDate])
  const parsedEndDate = useMemo(() => new Date(endDate + "T00:00:00"), [endDate])

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to print')
      return
    }

    // Get the print content
    const printContent = printContentRef.current?.innerHTML || ''

    // Write the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Planner - Print</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #000;
              background: #fff;
            }

            .print-view {
              padding: 0.5in;
              min-height: 100vh;
            }

            .print-header {
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 2px solid #000;
            }

            .print-footer {
              margin-top: 1rem;
              padding-top: 0.5rem;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 10px;
              color: #666;
            }

            h1 { font-size: 1.5rem; font-weight: bold; }
            h2 { font-size: 1.25rem; font-weight: bold; }
            h3 { font-size: 1rem; font-weight: 600; }
            h4 { font-size: 0.875rem; font-weight: 600; }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            th, td {
              padding: 0.25rem;
              text-align: left;
              vertical-align: top;
            }

            .border { border: 1px solid #e5e5e5; }
            .border-b { border-bottom: 1px solid #e5e5e5; }
            .border-black { border-color: #000; }
            .rounded { border-radius: 0.25rem; }
            .rounded-sm { border-radius: 0.125rem; }

            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-lg { font-size: 1.125rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }

            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }

            .text-center { text-align: center; }
            .text-right { text-align: right; }

            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }

            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-300 { background-color: #d1d5db; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-yellow-100 { background-color: #fef3c7; }
            .bg-green-100 { background-color: #dcfce7; }

            .text-red-700 { color: #b91c1c; }
            .text-yellow-700 { color: #a16207; }
            .text-green-700 { color: #15803d; }

            .italic { font-style: italic; }
            .line-through { text-decoration: line-through; }

            .flex { display: flex; }
            .flex-1 { flex: 1 1 0%; }
            .flex-shrink-0 { flex-shrink: 0; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .flex-wrap { flex-wrap: wrap; }

            .gap-1 { gap: 0.25rem; }
            .gap-2 { gap: 0.5rem; }

            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }

            .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
            .space-y-1 > * + * { margin-top: 0.25rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-6 > * + * { margin-top: 1.5rem; }

            .p-1 { padding: 0.25rem; }
            .p-2 { padding: 0.5rem; }
            .p-8 { padding: 2rem; }
            .px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
            .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .pb-1 { padding-bottom: 0.25rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .pt-4 { padding-top: 1rem; }

            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-0\\.5 { margin-top: 0.125rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-8 { margin-top: 2rem; }
            .ml-2 { margin-left: 0.5rem; }
            .ml-12 { margin-left: 3rem; }
            .ml-auto { margin-left: auto; }

            .w-3 { width: 0.75rem; }
            .w-4 { width: 1rem; }
            .w-8 { width: 2rem; }
            .w-24 { width: 6rem; }
            .w-full { width: 100%; }
            .w-1\\/4 { width: 25%; }
            .w-2\\.5 { width: 0.625rem; }
            .w-3\\.5 { width: 0.875rem; }

            .h-3 { height: 0.75rem; }
            .h-4 { height: 1rem; }
            .h-full { height: 100%; }
            .h-2\\.5 { height: 0.625rem; }
            .h-3\\.5 { height: 0.875rem; }

            .min-h-16 { min-height: 4rem; }
            .min-h-32 { min-height: 8rem; }
            .min-h-full { min-height: 100%; }
            .min-w-0 { min-width: 0; }

            .border-2 { border-width: 2px; }
            .border-b-2 { border-bottom-width: 2px; }

            .page-break-before { page-break-before: always; }

            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              .print-view { padding: 0; }
              .page-break-before { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)

    printWindow.document.close()

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Planner
          </DialogTitle>
          <DialogDescription>
            Customize your print options and preview before printing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* View Type */}
          <div className="space-y-2">
            <Label htmlFor="view-type">View Type</Label>
            <Select value={viewType} onValueChange={(v) => handleViewTypeChange(v as PrintViewType)}>
              <SelectTrigger id="view-type">
                <SelectValue placeholder="Select view type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily View</SelectItem>
                <SelectItem value="weekly">Weekly View</SelectItem>
                <SelectItem value="monthly">Monthly View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">
                {viewType === "daily" ? "Date" : "Start Date"}
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (viewType === "daily") {
                    setEndDate(e.target.value)
                  }
                }}
              />
            </div>
            {viewType !== "daily" && (
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-completed"
                  checked={includeCompleted}
                  onCheckedChange={(checked) => setIncludeCompleted(checked === true)}
                />
                <Label htmlFor="include-completed" className="font-normal cursor-pointer">
                  Include completed tasks
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-notes"
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                />
                <Label htmlFor="include-notes" className="font-normal cursor-pointer">
                  Include notes section
                </Label>
              </div>
            </div>
          </div>

          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name (optional)</Label>
              <Input
                id="company-name"
                placeholder="Your Company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-name">Your Name (optional)</Label>
              <Input
                id="user-name"
                placeholder="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>
          </div>

          {/* Preview Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? "Hide Preview" : "Show Preview"}
            </Button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-3 py-2 text-sm font-medium border-b">
                Print Preview
              </div>
              <div className="max-h-64 overflow-y-auto bg-white">
                <div className="transform scale-50 origin-top-left w-[200%]" ref={printContentRef}>
                  <PrintView
                    viewType={viewType}
                    startDate={parsedStartDate}
                    endDate={parsedEndDate}
                    tasksByDate={tasksByDate}
                    categoriesByDate={categoriesByDate}
                    habits={habits}
                    includeCompleted={includeCompleted}
                    includeNotes={includeNotes}
                    companyName={companyName}
                    userName={userName}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hidden print content for actual printing */}
          {!showPreview && (
            <div className="hidden" ref={printContentRef}>
              <PrintView
                viewType={viewType}
                startDate={parsedStartDate}
                endDate={parsedEndDate}
                tasksByDate={tasksByDate}
                categoriesByDate={categoriesByDate}
                habits={habits}
                includeCompleted={includeCompleted}
                includeNotes={includeNotes}
                companyName={companyName}
                userName={userName}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PrintDialog
