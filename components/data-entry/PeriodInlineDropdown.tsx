"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

export type Period = { id: string; name: string; startDate: string; endDate: string }

const buildMonthlyPeriod = (y: number, m: number): Period => {
  const start = new Date(y, m, 1)
  const end = new Date(y, m + 1, 0)
  return {
    id: `${y}-${String(m + 1).padStart(2, "0")}`,
    name: `${start.toLocaleDateString("en-US", { month: "long" })} ${y}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

const buildQuarterlyPeriod = (y: number, q: 1 | 2 | 3 | 4): Period => {
  const startMonth = (q - 1) * 3
  const start = new Date(y, startMonth, 1)
  const end = new Date(y, startMonth + 3, 0) // last day of quarter
  return {
    id: `${y}-Q${q}`,
    name: `Q${q} ${y}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

type Props = {
  value: Period | null
  onChange: (p: Period) => void
}

export default function PeriodInlineDropdown({ value, onChange }: Props) {
  const [open, setOpen] = React.useState(false)
  const now = new Date()
  const [year, setYear] = React.useState<number>(value ? Number(value.startDate.slice(0, 4)) : now.getFullYear())
  const [mode, setMode] = React.useState<"monthly" | "quarterly">("monthly")

  // If a quarterly period is currently selected, default the picker to quarterly.
  React.useEffect(() => {
    if (value?.id?.includes("-Q")) setMode("quarterly")
  }, [value?.id])

  const months = React.useMemo(
    () => Array.from({ length: 12 }, (_, i) => buildMonthlyPeriod(year, i)).reverse(),
    [year],
  )
  const quarters = React.useMemo(
    () => ([1, 2, 3, 4] as const).map((q) => buildQuarterlyPeriod(year, q)).reverse(),
    [year],
  )
  const items = mode === "quarterly" ? quarters : months

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="px-3 h-10 rounded-none border-x">
          <span className="text-sm text-muted-foreground mr-2">Period</span>
          <span className="font-medium">{value ? value.name : "Choose a period"}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[360px]" sideOffset={6}>
        <div className="flex items-center justify-between p-2 border-b gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {year - 1}
          </Button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={`text-xs px-2 py-1 rounded border ${mode === "monthly" ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setMode("quarterly")}
              className={`text-xs px-2 py-1 rounded border ${mode === "quarterly" ? "bg-blue-50 border-blue-200 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Quarterly
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)}>
            {year + 1} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="max-h-[420px] overflow-auto divide-y">
          {items.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onChange(p)
                setOpen(false)
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${value?.id === p.id ? "bg-blue-50" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
