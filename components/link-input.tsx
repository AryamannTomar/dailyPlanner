"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Link2, Plus, X } from "lucide-react"
import type { TaskLink } from "@/lib/types"

const MAX_LINKS = 3

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export default function LinkInput({
  links,
  onChange,
}: {
  links: TaskLink[]
  onChange: (links: TaskLink[]) => void
}) {
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleAddLink = () => {
    setError(null)

    if (!url.trim()) {
      setError("URL is required")
      return
    }

    if (!isValidUrl(url.trim())) {
      setError("Please enter a valid URL (http:// or https://)")
      return
    }

    if (links.length >= MAX_LINKS) {
      setError(`Maximum ${MAX_LINKS} links allowed`)
      return
    }

    const newLink: TaskLink = {
      url: url.trim(),
      title: title.trim() || new URL(url.trim()).hostname,
    }

    onChange([...links, newLink])
    setUrl("")
    setTitle("")
  }

  const handleRemoveLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index)
    onChange(newLinks)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddLink()
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
            >
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{link.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {link.url}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveLink(index)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove link</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new link form */}
      {links.length < MAX_LINKS && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                className="h-8 text-xs"
              />
            </div>
            <div className="w-32">
              <Input
                type="text"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-xs"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLink}
              className="h-8 px-2 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">Add link</span>
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">
            {links.length}/{MAX_LINKS} links added
          </p>
        </div>
      )}
    </div>
  )
}
