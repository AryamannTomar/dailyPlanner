"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Target, Flame } from "lucide-react"
import HabitStatistics from "@/components/habit-statistics"
import EstimationAccuracy from "@/components/estimation-accuracy"
import type { CategoriesByDate, HabitDefinition, TasksByDate } from "@/lib/types"

export default function StatisticsDialog({
  categoriesByDate,
  habits,
  tasksByDate,
}: {
  categoriesByDate: CategoriesByDate
  habits: HabitDefinition[]
  tasksByDate?: TasksByDate
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Statistics</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statistics & Analytics</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="estimation" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="estimation" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Estimation Accuracy
            </TabsTrigger>
            <TabsTrigger value="habits" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Habit Statistics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="estimation" className="mt-4">
            {tasksByDate ? (
              <EstimationAccuracy tasksByDate={tasksByDate} />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No task data available
              </div>
            )}
          </TabsContent>
          <TabsContent value="habits" className="mt-4">
            <HabitStatistics categoriesByDate={categoriesByDate} habits={habits} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
