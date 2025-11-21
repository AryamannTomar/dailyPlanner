"use client"

import { useState, KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

const MAX_TAGS = 5

export default function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
}) {
  const [inputValue, setInputValue] = useState("")

  function addTag(value: string) {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return
    if (tags.length >= MAX_TAGS) return
    if (tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInputValue("")
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags[tags.length - 1])
    }
  }

  function handleInputChange(value: string) {
    // Check for comma and add tag if found
    if (value.includes(",")) {
      const parts = value.split(",")
      parts.forEach((part, index) => {
        if (index < parts.length - 1) {
          addTag(part)
        } else {
          setInputValue(part)
        }
      })
    } else {
      setInputValue(value)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-foreground">
        Tags {tags.length > 0 && `(${tags.length}/${MAX_TAGS})`}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background px-2 py-1.5 min-h-[38px]">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 text-xs px-2 py-0.5"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:text-destructive focus:outline-none cursor-pointer"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {tags.length < MAX_TAGS && (
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? "Add tags (press Enter or comma)" : "Add more..."}
            className="flex-1 min-w-[100px] h-7 border-0 bg-transparent px-1 text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        )}
      </div>
      {tags.length >= MAX_TAGS && (
        <span className="text-xs text-muted-foreground">Maximum {MAX_TAGS} tags reached</span>
      )}
    </div>
  )
}
