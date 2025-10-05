"use client"

import * as React from "react"
import { Virtuoso } from "react-virtuoso"
import { Plus, Search, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type DataElement = { id: number; code: string; name: string; description?: string }

export default function DataElementPalette({
  elements,
  onBind,
}: {
  elements: DataElement[]
  onBind: (el: DataElement) => void
}) {
  const [q, setQ] = React.useState("")
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return elements
    return elements.filter((e) => e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s))
  }, [elements, q])

  const handleDragStart = (e: React.DragEvent, el: DataElement) => {
    e.dataTransfer.effectAllowed = "copy"
    e.dataTransfer.setData("application/json", JSON.stringify(el))
    e.dataTransfer.setData("text/plain", el.code)
  }

  return (
    <aside className="border rounded p-2 h-full flex flex-col">
      <div className="text-xs font-semibold mb-2">Data elements</div>
      <div className="flex items-center gap-2 mb-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-8" />
      </div>
      <div className="flex-1 min-h-0">
        <Virtuoso
          style={{ height: "100%" }}
          totalCount={filtered.length}
          itemContent={(index) => {
            const el = filtered[index]
            return (
              <div
                key={el.id}
                draggable
                onDragStart={(e) => handleDragStart(e, el)}
                className="flex items-start gap-2 px-2 py-2 border-b last:border-b-0 cursor-move hover:bg-gray-50 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{el.name}</div>
                  <div className="text-[11px] text-gray-500">{el.code}</div>
                  {el.description && <div className="text-[11px] text-gray-400 mt-0.5">{el.description}</div>}
                </div>
                <Button size="sm" onClick={() => onBind(el)} className="h-7 px-2">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )
          }}
        />
      </div>
      <div className="text-[11px] text-gray-500 mt-2">
        <strong>Tip:</strong> Drag elements to cells or select a cell and click <strong>+</strong> to bind.
      </div>
    </aside>
  )
}
