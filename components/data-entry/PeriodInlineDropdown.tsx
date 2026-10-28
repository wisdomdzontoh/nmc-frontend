"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { PickerTrigger } from "./PickerTrigger"

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
        <PickerTrigger
          label="Period"
          chosen={value ? value.name : null}
          placeholder="Choose a period"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[min(360px,calc(100vw-2rem))]" sideOffset={6}>
        <div className="flex items-center justify-between p-2 border-b gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {year - 1}
          </Button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={`text-xs px-2 py-1 rounded border ${mode === "monthly" ? "bg-primary-soft border-primary-border text-primary font-semibold" : "border-border text-muted-foreground hover:bg-surface-subtle"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setMode("quarterly")}
              className={`text-xs px-2 py-1 rounded border ${mode === "quarterly" ? "bg-primary-soft border-primary-border text-primary font-semibold" : "border-border text-muted-foreground hover:bg-surface-subtle"}`}
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
              className={`w-full text-left px-4 py-3 text-sm hover:bg-surface-subtle ${value?.id === p.id ? "bg-primary-soft font-semibold text-primary" : ""}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
