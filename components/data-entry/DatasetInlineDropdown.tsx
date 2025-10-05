"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

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
}

type Props = {
  value: ReportType | null
  onChange: (rt: ReportType | null) => void
  items: ReportType[]
}

export default function DatasetInlineDropdown({ value, onChange, items }: Props) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="px-3 h-10 rounded-none border-x">
          <span className="text-sm text-muted-foreground mr-2">Data set</span>
          <span className="font-medium truncate max-w-[320px]">{value ? value.name : "Choose a data set"}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[420px] h-[520px] overflow-auto" sideOffset={6}>
        <div className="divide-y">
          {items.map((rt) => (
            <button
              key={rt.id}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${value?.id === rt.id ? "bg-blue-50" : ""}`}
              onClick={() => {
                onChange(rt)
                setOpen(false)
              }}
            >
              <div className="font-medium">{rt.name}</div>
              <div className="text-xs text-gray-500">
                {rt.code} • {rt.data_elements?.length ?? 0} data elements
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
