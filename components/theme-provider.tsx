'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { initializeColorTheme } from '@/lib/theme-utils'

// Component to initialize color theme on mount
function ColorThemeInitializer() {
  React.useEffect(() => {
    initializeColorTheme()
  }, [])
  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={['light', 'dark']}
      {...props}
    >
      <ColorThemeInitializer />
      {children}
    </NextThemesProvider>
  )
}
