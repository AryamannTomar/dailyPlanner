"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { SearchFilters } from "@/lib/search-utils"
import { hasActiveFilters, defaultFilters } from "@/lib/search-utils"
import {
  Search,
  X,
  Filter,
  Calendar,
  Tag,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react"

interface SearchFilterProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  availableTags: string[]
  resultCount?: number
  totalCount?: number
}

export default function SearchFilter({
  filters,
  onFiltersChange,
  availableTags,
  resultCount,
  totalCount,
}: SearchFilterProps) {
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false)

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearAllFilters = () => {
    onFiltersChange(defaultFilters)
  }

  const toggleTag = (tag: string) => {
    const currentTags = filters.tags
    if (currentTags.includes(tag)) {
      updateFilter('tags', currentTags.filter(t => t !== tag))
    } else {
      updateFilter('tags', [...currentTags, tag])
    }
  }

  const isFiltered = hasActiveFilters(filters)

  return (
    <div className="w-full space-y-3">
      {/* Search and main controls row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-9 pr-9"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => updateFilter('query', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-2">
          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter('status', value as SearchFilters['status'])}
          >
            <SelectTrigger className="w-[130px]">
              <CheckCircle className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filters.priority}
            onValueChange={(value) => updateFilter('priority', value as SearchFilters['priority'])}
          >
            <SelectTrigger className="w-[130px]">
              <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Pickers */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={filters.fromDate || ''}
                onChange={(e) => updateFilter('fromDate', e.target.value || null)}
                className="pl-8 w-[140px] text-sm"
                aria-label="From date"
              />
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => updateFilter('toDate', e.target.value || null)}
              className="w-[130px] text-sm"
              aria-label="To date"
            />
          </div>

          {/* Tags Multi-select */}
          {availableTags.length > 0 && (
            <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "min-w-[100px] justify-between",
                    filters.tags.length > 0 && "border-primary"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {filters.tags.length === 0
                        ? "Tags"
                        : `${filters.tags.length} tag${filters.tags.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <ScrollArea className="max-h-[200px]">
                  <div className="p-2 space-y-1">
                    {availableTags.map((tag) => (
                      <label
                        key={tag}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.tags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                          className="border-border bg-background data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-sm truncate">{tag}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                {filters.tags.length > 0 && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => updateFilter('tags', [])}
                    >
                      Clear tags
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Clear All Filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Selected tags display */}
      {filters.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filters.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1 text-xs px-2 py-0.5"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="ml-0.5 hover:text-destructive focus:outline-none cursor-pointer"
                aria-label={`Remove ${tag} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results count */}
      {isFiltered && resultCount !== undefined && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            {resultCount} result{resultCount !== 1 ? 's' : ''} found
            {totalCount !== undefined && totalCount !== resultCount && (
              <span> (out of {totalCount} tasks)</span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
