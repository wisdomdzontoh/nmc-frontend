"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDown, ChevronRight, Check, Folder, Search } from "lucide-react"
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
            "flex items-center gap-2 py-2 px-2 rounded-md transition-colors",
            value?.id === node.id ? "bg-primary/5" : "hover:bg-muted/50",
          )}
          style={{ paddingLeft: 10 + lvl * 20 }}
        >
          {hasChildren ? (
            <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" onClick={() => toggle(node.id)}>
              {expanded[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}

          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />

          <button
            className="flex-1 text-left text-sm min-w-0"
            onClick={() => {
              onChange(node)
              setOpen(false)
            }}
            title={node.name}
          >
            <span className={cn("truncate block", value?.id === node.id && "font-medium")}>{node.name}</span>
            {node.type && <span className="ml-1 text-xs text-muted-foreground">{node.type}</span>}
          </button>

          {value?.id === node.id && <Check className="h-4 w-4 text-primary shrink-0" />}
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
          <span className="text-sm text-muted-foreground mr-2">Select you department</span>
          <span className="font-medium truncate max-w-[240px]">
            {value ? value.name : "Choose your department"}
          </span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="p-0 w-[520px]" sideOffset={6}>
        <div className="p-3 border-b relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search org units"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="h-[400px] overflow-auto border-t p-2">
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
