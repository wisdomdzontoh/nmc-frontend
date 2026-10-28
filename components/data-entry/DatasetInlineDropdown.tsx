"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, ClipboardList } from "lucide-react"
import { PickerTrigger } from "./PickerTrigger"
import { cn } from "@/lib/utils"

export interface DataElement {
  id: number
  code: string
  name: string
}
export interface ReportType {
  id: number
  code: string
  name: string
  description?: string
  data_elements: DataElement[]
  lock_period_days?: number
}

type Props = {
  value: ReportType | null
  onChange: (rt: ReportType | null) => void
  items: ReportType[]
}

export default function DatasetInlineDropdown({ value, onChange, items }: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filteredItems = React.useMemo(() => {
    if (!query) return items
    
    const lowerQuery = query.toLowerCase()
    return items.filter(
      (rt) =>
        rt.name.toLowerCase().includes(lowerQuery) ||
        rt.code.toLowerCase().includes(lowerQuery) ||
        rt.description?.toLowerCase().includes(lowerQuery)
    )
  }, [items, query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PickerTrigger
          label="Report"
          chosen={value ? value.name : null}
          placeholder="Choose a report"
          icon={<ClipboardList className="h-4 w-4" />}
        />
      </PopoverTrigger>

      <PopoverContent 
        align="start" 
        className="p-0 w-[min(420px,calc(100vw-2rem))]" 
        sideOffset={6}
        side="bottom"
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={8}
      >
        <div className="p-3 border-b bg-card sticky top-0 z-10">
          <Input 
            placeholder="Search reports" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="w-full"
          />
        </div>
        <div className="max-h-[calc(100vh-250px)] min-h-[200px] overflow-y-auto overscroll-contain">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {query ? "No report types match your search." : "No report types available."}
            </div>
          ) : (
            <div className="divide-y">
              {filteredItems.map((rt) => (
                <button
                  key={rt.id}
                  className={cn(
                    "w-full text-left px-4 py-2.5 hover:bg-surface-subtle flex items-center justify-between transition-colors",
                    value?.id === rt.id && "bg-info-bg"
                  )}
                  onClick={() => {
                    onChange(rt)
                    setOpen(false)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{rt.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {rt.code} • {rt.data_elements?.length ?? 0} data elements
                    </div>
                  </div>
                  {value?.id === rt.id && <Check className="h-4 w-4 text-info flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t bg-card sticky bottom-0 z-10 flex justify-between">
          <Button variant="outline" size="sm" onClick={() => onChange(null)}>
            Clear
          </Button>
          <Button size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
