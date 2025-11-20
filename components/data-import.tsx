"use client"

import { useState, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Download,
  Info,
} from "lucide-react"
import {
  parseJSONImport,
  parseCSVImport,
  detectImportFormat,
  generateTasksCSVTemplate,
  generateHabitsCSVTemplate,
  generateJSONTemplate,
  type MergeStrategy,
  type ImportType,
  type ImportData,
  type ImportValidationResult,
  type ImportSummary,
} from "@/lib/data-import-utils"
import { toast } from "sonner"

interface DataImportProps {
  onImportComplete?: () => void
}

export default function DataImport({ onImportComplete }: DataImportProps) {
  const [open, setOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>("")
  const [importType, setImportType] = useState<ImportType>("json")
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null)
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>("merge_keep")
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setFile(null)
    setFileContent("")
    setValidationResult(null)
    setImportProgress(0)
    setImportSummary(null)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setTimeout(resetState, 300)
  }, [resetState])

  const processFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setImportSummary(null)

    try {
      const content = await selectedFile.text()
      setFileContent(content)

      // Detect format
      const detectedType = detectImportFormat(content, selectedFile.name)
      setImportType(detectedType)

      // Parse and validate
      let result: ImportValidationResult

      if (detectedType === "json") {
        result = parseJSONImport(content)
      } else if (detectedType === "csv_tasks") {
        result = parseCSVImport(content, "tasks")
      } else {
        result = parseCSVImport(content, "habits")
      }

      setValidationResult(result)
    } catch (error) {
      console.error("Error processing file:", error)
      setValidationResult({
        isValid: false,
        errors: [{ field: "file", message: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}` }],
        warnings: [],
      })
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [processFile])

  const handleImport = async () => {
    if (!validationResult?.data || !validationResult.isValid) return

    setIsImporting(true)
    setImportProgress(10)

    try {
      setImportProgress(30)

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: validationResult.data,
          type: importType,
          mergeStrategy,
        }),
      })

      setImportProgress(70)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Import failed")
      }

      const result = await response.json()
      setImportProgress(100)
      setImportSummary(result.summary)

      toast.success("Import successful", {
        description: `Added ${result.summary.tasksAdded} tasks, ${result.summary.habitsAdded} habits`,
      })

      if (onImportComplete) {
        onImportComplete()
      }

      // Auto-close after success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error("Import failed:", error)
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = (type: "json" | "csv_tasks" | "csv_habits") => {
    let content: string
    let filename: string
    let mimeType: string

    if (type === "json") {
      content = generateJSONTemplate()
      filename = "import-template.json"
      mimeType = "application/json"
    } else if (type === "csv_tasks") {
      content = generateTasksCSVTemplate()
      filename = "tasks-template.csv"
      mimeType = "text/csv"
    } else {
      content = generateHabitsCSVTemplate()
      filename = "habits-template.csv"
      mimeType = "text/csv"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getPreviewStats = () => {
    if (!validationResult?.data) return null

    const data = validationResult.data
    const taskCount = data.tasksByDate
      ? Object.values(data.tasksByDate).reduce((sum, tasks) => sum + tasks.length, 0)
      : 0
    const dateCount = data.tasksByDate ? Object.keys(data.tasksByDate).length : 0
    const habitCount = data.habits?.length || 0
    const categoryCount = data.categoriesByDate ? Object.keys(data.categoriesByDate).length : 0

    return { taskCount, dateCount, habitCount, categoryCount }
  }

  const stats = getPreviewStats()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import tasks and habits from JSON or CSV files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="upload" className="h-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4 space-y-4">
              {/* File dropzone */}
              {!file && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports JSON and CSV formats
                  </p>
                </div>
              )}

              {/* File info and validation */}
              {file && (
                <div className="space-y-4">
                  {/* File header */}
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      {importType === "json" ? (
                        <FileJson className="h-8 w-8 text-amber-500" />
                      ) : (
                        <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB - {importType.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetState}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Validation errors */}
                  {validationResult && !validationResult.isValid && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription>
                        <ScrollArea className="h-32 mt-2">
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            {validationResult.errors.map((error, i) => (
                              <li key={i}>{error.message}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation warnings */}
                  {validationResult?.warnings && validationResult.warnings.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Warnings</AlertTitle>
                      <AlertDescription>
                        <ScrollArea className="h-24 mt-2">
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            {validationResult.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Preview stats */}
                  {validationResult?.isValid && stats && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            File validated successfully
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {stats.taskCount > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Tasks:</span>{" "}
                              <span className="font-medium">{stats.taskCount}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({stats.dateCount} dates)
                              </span>
                            </div>
                          )}
                          {stats.habitCount > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Habits:</span>{" "}
                              <span className="font-medium">{stats.habitCount}</span>
                            </div>
                          )}
                          {stats.categoryCount > 0 && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Habit entries:</span>{" "}
                              <span className="font-medium">{stats.categoryCount} dates</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Merge strategy selector */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Merge Strategy</Label>
                        <RadioGroup
                          value={mergeStrategy}
                          onValueChange={(value) => setMergeStrategy(value as MergeStrategy)}
                          className="space-y-2"
                        >
                          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                            <div className="space-y-1">
                              <Label htmlFor="replace" className="font-medium cursor-pointer">
                                Replace All
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Remove existing data and replace with imported data
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="merge_keep" id="merge_keep" className="mt-0.5" />
                            <div className="space-y-1">
                              <Label htmlFor="merge_keep" className="font-medium cursor-pointer">
                                Merge (Keep Existing)
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Add new items, skip duplicates (matched by description)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                            <RadioGroupItem value="merge_overwrite" id="merge_overwrite" className="mt-0.5" />
                            <div className="space-y-1">
                              <Label htmlFor="merge_overwrite" className="font-medium cursor-pointer">
                                Merge (Overwrite Duplicates)
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Add new items, update existing duplicates
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}

                  {/* Import progress */}
                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Importing...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <Progress value={importProgress} className="h-2" />
                    </div>
                  )}

                  {/* Import summary */}
                  {importSummary && (
                    <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                        Import Complete
                      </AlertTitle>
                      <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          {importSummary.tasksAdded > 0 && (
                            <div>Tasks added: {importSummary.tasksAdded}</div>
                          )}
                          {importSummary.tasksUpdated > 0 && (
                            <div>Tasks updated: {importSummary.tasksUpdated}</div>
                          )}
                          {importSummary.tasksSkipped > 0 && (
                            <div>Tasks skipped: {importSummary.tasksSkipped}</div>
                          )}
                          {importSummary.habitsAdded > 0 && (
                            <div>Habits added: {importSummary.habitsAdded}</div>
                          )}
                          {importSummary.habitsUpdated > 0 && (
                            <div>Habits updated: {importSummary.habitsUpdated}</div>
                          )}
                          {importSummary.habitsSkipped > 0 && (
                            <div>Habits skipped: {importSummary.habitsSkipped}</div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Download sample templates to see the expected format for importing data.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileJson className="h-6 w-6 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium">JSON Template</p>
                      <p className="text-xs text-muted-foreground">
                        Full format with tasks, habits, and categories
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("json")}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">Tasks CSV Template</p>
                      <p className="text-xs text-muted-foreground">
                        Import tasks with date, time, description
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("csv_tasks")}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Habits CSV Template</p>
                      <p className="text-xs text-muted-foreground">
                        Import habit definitions
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate("csv_habits")}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Format Notes</AlertTitle>
                <AlertDescription className="text-sm mt-2 space-y-2">
                  <p><strong>Dates:</strong> Use YYYY-MM-DD format (e.g., 2025-01-15)</p>
                  <p><strong>Times:</strong> Use HH:MM or HH:MM:SS format (e.g., 09:00, 14:30:00)</p>
                  <p><strong>Tags:</strong> Separate multiple tags with semicolons (e.g., work;meeting)</p>
                  <p><strong>Priority:</strong> Use high, medium, or low</p>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !validationResult?.isValid || !!importSummary}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
