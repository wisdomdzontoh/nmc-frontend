"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText } from "lucide-react"

export interface DataElement {
  id: number
  code: string
  name: string
  description?: string
  category?: { id: number; name: string }
}
export interface ReportType {
  id: number
  code: string
  name: string
  description?: string
  data_elements: DataElement[]
}

type Props = {
  reportTypes: ReportType[]
  value: ReportType | null
  onChange: (rt: ReportType | null) => void
}

export default function ReportTypeSelect({ reportTypes, value, onChange }: Props) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Select Data Set
        </CardTitle>
        <CardDescription>Choose the report/data set to enter values for.</CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={value?.id ? String(value.id) : ""}
          onValueChange={(id) => onChange(reportTypes.find((r) => String(r.id) === id) || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a data set..." />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map((rt) => (
              <SelectItem key={rt.id} value={String(rt.id)}>
                <div className="flex flex-col">
                  <span className="font-medium">{rt.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {rt.code} • {rt.data_elements?.length || 0} data elements
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
