"use client";

import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ColorTheme,
  getThemeList,
  applyColorTheme,
  getSavedColorTheme,
  ThemeDefinition,
} from "@/lib/theme-utils";
import { cn } from "@/lib/utils";

interface ThemeSwatchProps {
  theme: ThemeDefinition;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeSwatch({ theme, isSelected, onClick }: ThemeSwatchProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105",
            isSelected
              ? "border-primary ring-2 ring-primary/20"
              : "border-transparent hover:border-muted-foreground/30"
          )}
          aria-label={`Select ${theme.name} theme`}
          aria-pressed={isSelected}
        >
          {/* Color swatch preview */}
          <div className="relative w-12 h-12 rounded-md overflow-hidden shadow-sm">
            {/* Primary color - left half */}
            <div
              className="absolute inset-y-0 left-0 w-1/2"
              style={{ backgroundColor: theme.previewColors.primary }}
            />
            {/* Secondary color - top right */}
            <div
              className="absolute top-0 right-0 w-1/2 h-1/2"
              style={{ backgroundColor: theme.previewColors.secondary }}
            />
            {/* Accent color - bottom right */}
            <div
              className="absolute bottom-0 right-0 w-1/2 h-1/2"
              style={{ backgroundColor: theme.previewColors.accent }}
            />
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Check className="h-5 w-5 text-white drop-shadow-md" />
              </div>
            )}
          </div>
          {/* Theme name */}
          <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
            {theme.name}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <p className="font-medium">{theme.name}</p>
        <p className="text-[10px] opacity-80">{theme.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ThemePickerProps {
  className?: string;
}

export default function ThemePicker({ className }: ThemePickerProps) {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>("default");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const themes = getThemeList();

  useEffect(() => {
    setMounted(true);
    const savedTheme = getSavedColorTheme();
    setCurrentTheme(savedTheme);
    applyColorTheme(savedTheme);
  }, []);

  const handleThemeSelect = (themeId: ColorTheme) => {
    setCurrentTheme(themeId);
    applyColorTheme(themeId);
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Select color theme"
        title="Select color theme"
        className={className}
      >
        <Palette className="h-4 w-4 opacity-0" />
      </Button>
    );
  }

  const currentThemeData = themes.find((t) => t.id === currentTheme);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Select color theme"
          title="Select color theme"
          className={cn("relative", className)}
        >
          <Palette className="h-4 w-4" />
          {/* Color indicator dot */}
          {currentTheme !== "default" && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-background"
              style={{
                backgroundColor: currentThemeData?.previewColors.primary,
              }}
            />
          )}
          <span className="sr-only">Select color theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        align="end"
        sideOffset={8}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-sm font-medium">Color Theme</h4>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {themes.map((theme) => (
              <ThemeSwatch
                key={theme.id}
                theme={theme}
                isSelected={currentTheme === theme.id}
                onClick={() => handleThemeSelect(theme.id)}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Themes apply to both light and dark modes
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Export a compact version for settings panel
export function ThemePickerInline({ className }: ThemePickerProps) {
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>("default");
  const [mounted, setMounted] = useState(false);
  const themes = getThemeList();

  useEffect(() => {
    setMounted(true);
    const savedTheme = getSavedColorTheme();
    setCurrentTheme(savedTheme);
  }, []);

  const handleThemeSelect = (themeId: ColorTheme) => {
    setCurrentTheme(themeId);
    applyColorTheme(themeId);
  };

  if (!mounted) {
    return (
      <div className={cn("grid grid-cols-3 gap-2", className)}>
        {themes.map((theme) => (
          <div
            key={theme.id}
            className="h-16 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-3 gap-2">
        {themes.map((theme) => (
          <ThemeSwatch
            key={theme.id}
            theme={theme}
            isSelected={currentTheme === theme.id}
            onClick={() => handleThemeSelect(theme.id)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Themes apply to both light and dark modes
      </p>
    </div>
  );
}
