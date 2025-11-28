"use client"

import * as React from "react"
import { Database, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DataElement {
  id: number
  code: string
  name: string
  description?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (dataElement: Omit<DataElement, 'id'>) => void
  dataElement?: DataElement | null
}

export function DataElementModal({
  open,
  onOpenChange,
  onSave,
  dataElement
}: Props) {
  const [formData, setFormData] = React.useState<Omit<DataElement, 'id'>>({
    code: "",
    name: "",
    description: ""
  })

  // Initialize form when dataElement changes
  React.useEffect(() => {
    if (dataElement) {
      setFormData({
        code: dataElement.code,
        name: dataElement.name,
        description: dataElement.description || ""
      })
    } else {
      setFormData({
        code: "",
        name: "",
        description: ""
      })
    }
  }, [dataElement])

  const handleSave = () => {
    if (!formData.code || !formData.name) {
      return
    }

    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {dataElement ? "Edit Data Element" : "Create New Data Element"}
          </DialogTitle>
          <DialogDescription>
            {dataElement 
              ? "Update the data element details."
              : "Define a new data element that can be used in reports and indicators."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="e.g., DE001"
              className="font-mono"
            />
            <p className="text-xs text-gray-500">Unique identifier for this data element</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Number of OPD visits"
            />
            <p className="text-xs text-gray-500">Display name for this data element</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this data element represents..."
              rows={3}
            />
            <p className="text-xs text-gray-500">Optional description to help users understand this data element</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.code || !formData.name}>
            <Save className="h-4 w-4 mr-2" />
            {dataElement ? "Update" : "Create"} Data Element
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

