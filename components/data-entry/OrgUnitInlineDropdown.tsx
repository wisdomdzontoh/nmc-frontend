"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type OrgNode = { id: number; name: string; type?: string; children?: OrgNode[] }

type Props = {
  value: OrgNode | null
  onChange: (n: OrgNode | null) => void
  tree: OrgNode[]
}

export default function OrgUnitInlineDropdown({ value, onChange, tree }: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({})

  const toggle = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }))
  const match = (s: string) => s.toLowerCase().includes(query.toLowerCase())

  const Row: React.FC<{ node: OrgNode; lvl: number }> = ({ node, lvl }) => {
    const visible =
      !query || match(node.name) || node.children?.some((c) => match(c.name) || c.children?.some((g) => match(g.name)))
    if (!visible) return null

    const hasChildren = !!node.children?.length

    return (
      <div>
        <div
          className={cn(
            "flex items-center py-1.5 rounded pr-2",
            value?.id === node.id ? "bg-blue-50" : "hover:bg-gray-50",
          )}
          style={{ paddingLeft: 10 + lvl * 16 }}
        >
          {hasChildren ? (
            <button className="mr-1 p-1" onClick={() => toggle(node.id)}>
              {expanded[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}

          <button
            className="flex-1 text-left px-2"
            onClick={() => {
              onChange(node)
              setOpen(false)
            }}
            title={node.name}
          >
            <span className="font-medium">{node.name}</span>
            {node.type && <span className="ml-2 text-xs text-gray-500">{node.type}</span>}
          </button>

          {value?.id === node.id && <Check className="h-4 w-4 text-blue-600" />}
        </div>

        {hasChildren && expanded[node.id] && (
          <div className="mt-0.5">
            {node.children!.map((c) => (
              <Row key={c.id} node={c} lvl={lvl + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="px-3 h-10 rounded-none border-x">
          <span className="text-sm text-muted-foreground mr-2">Organisation unit</span>
          <span className="font-medium truncate max-w-[240px]">
            {value ? value.name : "Choose an organisation unit"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[520px]" sideOffset={6}>
        <div className="p-3 border-b">
          <Input placeholder="Search org units" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="h-[520px] overflow-auto">
          {tree.map((root) => (
            <Row key={root.id} node={root} lvl={0} />
          ))}
        </div>
        <div className="p-3 border-t flex justify-between">
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
