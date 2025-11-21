"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Keyboard, Search } from "lucide-react"
import { getGroupedShortcuts, formatShortcutKeys, type Shortcut } from "@/lib/shortcuts"
import { cn } from "@/lib/utils"

type KeyboardShortcutsHelpProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  triggerButton?: boolean
}

export default function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  triggerButton = true,
}: KeyboardShortcutsHelpProps) {
  const [search, setSearch] = useState("")

  const groupedShortcuts = useMemo(() => getGroupedShortcuts(), [])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groupedShortcuts

    const searchLower = search.toLowerCase().trim()
    return groupedShortcuts
      .map((group) => ({
        ...group,
        shortcuts: group.shortcuts.filter(
          (shortcut) =>
            shortcut.label.toLowerCase().includes(searchLower) ||
            shortcut.description.toLowerCase().includes(searchLower) ||
            formatShortcutKeys(shortcut).toLowerCase().includes(searchLower)
        ),
      }))
      .filter((group) => group.shortcuts.length > 0)
  }, [groupedShortcuts, search])

  const content = (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </DialogTitle>
      </DialogHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search shortcuts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No shortcuts found matching "{search}"
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut) => (
                    <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">?</kbd> to toggle this help
      </div>
    </>
  )

  if (!triggerButton) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">{content}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts">
          <Keyboard className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">{content}</DialogContent>
    </Dialog>
  )
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  const keys = formatShortcutKeys(shortcut)

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="text-sm font-medium">{shortcut.label}</div>
        <div className="text-xs text-muted-foreground">{shortcut.description}</div>
      </div>
      <div className="flex items-center gap-1">
        <ShortcutKeys keys={keys} />
      </div>
    </div>
  )
}

export function ShortcutKeys({ keys, className }: { keys: string; className?: string }) {
  // Split keys by " then " for sequences, then by "+" for modifiers
  const parts = keys.split(" then ")

  return (
    <span className={cn("flex items-center gap-1", className)}>
      {parts.map((part, partIndex) => (
        <span key={partIndex} className="flex items-center gap-0.5">
          {partIndex > 0 && (
            <span className="text-xs text-muted-foreground mx-1">then</span>
          )}
          {part.split("+").map((key, keyIndex) => (
            <kbd
              key={keyIndex}
              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-muted border border-border font-mono text-xs font-medium shadow-sm"
            >
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  )
}

// Component to display shortcut hint in tooltips
export function ShortcutHint({ shortcutKey }: { shortcutKey: string }) {
  return (
    <span className="ml-2 text-muted-foreground">
      <kbd className="px-1 py-0.5 rounded bg-background/50 font-mono text-[10px]">
        {shortcutKey}
      </kbd>
    </span>
  )
}
