"use client"

import { useEffect, useRef, useCallback } from "react"
import type { ShortcutKey, ShortcutModifier } from "@/lib/shortcuts"

export type ShortcutHandler = {
  id: string
  keys: ShortcutKey[]
  handler: () => void
  // If true, the shortcut works even when focus is in an input field
  global?: boolean
  // If true, prevent default browser behavior
  preventDefault?: boolean
}

type SequenceState = {
  keys: string[]
  timestamp: number
}

const SEQUENCE_TIMEOUT = 1000 // 1 second to complete a sequence

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const sequenceStateRef = useRef<SequenceState>({ keys: [], timestamp: 0 })

  const checkModifiers = useCallback(
    (event: KeyboardEvent, modifiers?: ShortcutModifier[]): boolean => {
      if (!modifiers || modifiers.length === 0) {
        // If no modifiers required, make sure none are pressed (except Shift for special chars)
        const key = event.key
        const isSpecialChar = ["?", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+"].includes(key)
        if (isSpecialChar) {
          // Allow Shift for special characters
          return !event.ctrlKey && !event.altKey && !event.metaKey
        }
        return !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey
      }

      const requiredCtrl = modifiers.includes("ctrl")
      const requiredShift = modifiers.includes("shift")
      const requiredAlt = modifiers.includes("alt")
      const requiredMeta = modifiers.includes("meta")

      return (
        event.ctrlKey === requiredCtrl &&
        event.shiftKey === requiredShift &&
        event.altKey === requiredAlt &&
        event.metaKey === requiredMeta
      )
    },
    []
  )

  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement
    if (!activeElement) return false

    const tagName = activeElement.tagName.toLowerCase()
    const isInput = tagName === "input" || tagName === "textarea" || tagName === "select"
    const isContentEditable = activeElement.getAttribute("contenteditable") === "true"

    return isInput || isContentEditable
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const now = Date.now()
      const inputFocused = isInputFocused()

      // Check for single-key shortcuts first
      for (const shortcut of shortcuts) {
        // Skip non-global shortcuts when input is focused
        if (inputFocused && !shortcut.global) {
          continue
        }

        // Handle single-key shortcuts
        if (shortcut.keys.length === 1) {
          const keyDef = shortcut.keys[0]
          const keyMatches =
            event.key.toLowerCase() === keyDef.key.toLowerCase() || event.key === keyDef.key

          if (keyMatches && checkModifiers(event, keyDef.modifiers)) {
            if (shortcut.preventDefault !== false) {
              event.preventDefault()
            }
            shortcut.handler()
            // Reset sequence on single-key match
            sequenceStateRef.current = { keys: [], timestamp: now }
            return
          }
        }
      }

      // Handle sequence shortcuts
      // Reset sequence if too much time has passed
      if (now - sequenceStateRef.current.timestamp > SEQUENCE_TIMEOUT) {
        sequenceStateRef.current = { keys: [], timestamp: now }
      }

      // Don't track sequences when input is focused (unless all chars are global)
      if (inputFocused) {
        return
      }

      // Add current key to sequence
      const currentKey = event.key.toLowerCase()
      const newSequence = [...sequenceStateRef.current.keys, currentKey]
      sequenceStateRef.current = { keys: newSequence, timestamp: now }

      // Check for sequence matches
      for (const shortcut of shortcuts) {
        if (shortcut.keys.length <= 1) continue

        const sequenceKeys = shortcut.keys.map((k) => k.key.toLowerCase())
        const matches =
          newSequence.length === sequenceKeys.length &&
          newSequence.every((key, index) => key === sequenceKeys[index])

        if (matches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          shortcut.handler()
          // Reset sequence after match
          sequenceStateRef.current = { keys: [], timestamp: now }
          return
        }

        // Check if current sequence could still match this shortcut
        const couldMatch = sequenceKeys
          .slice(0, newSequence.length)
          .every((key, index) => key === newSequence[index])

        if (!couldMatch && newSequence.length >= sequenceKeys.length) {
          // This shortcut won't match, continue checking others
        }
      }

      // If sequence is longer than any shortcut, reset it
      const maxSequenceLength = Math.max(...shortcuts.map((s) => s.keys.length))
      if (newSequence.length >= maxSequenceLength) {
        sequenceStateRef.current = { keys: [], timestamp: now }
      }
    },
    [shortcuts, checkModifiers, isInputFocused]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}

// Hook to show keyboard shortcut hint in tooltip
export function useShortcutHint(shortcutId: string, shortcuts: ShortcutHandler[]): string {
  const shortcut = shortcuts.find((s) => s.id === shortcutId)
  if (!shortcut) return ""

  return shortcut.keys
    .map((keyDef) => {
      const parts: string[] = []

      if (keyDef.modifiers) {
        keyDef.modifiers.forEach((mod) => {
          switch (mod) {
            case "ctrl":
              parts.push("Ctrl")
              break
            case "shift":
              parts.push("Shift")
              break
            case "alt":
              parts.push("Alt")
              break
            case "meta":
              parts.push(typeof navigator !== "undefined" && navigator.platform.includes("Mac") ? "Cmd" : "Ctrl")
              break
          }
        })
      }

      let keyDisplay = keyDef.key
      switch (keyDef.key) {
        case "ArrowLeft":
          keyDisplay = "Left"
          break
        case "ArrowRight":
          keyDisplay = "Right"
          break
        case "Escape":
          keyDisplay = "Esc"
          break
        default:
          keyDisplay = keyDef.key.toUpperCase()
      }

      parts.push(keyDisplay)
      return parts.join("+")
    })
    .join(" ")
}
