"use client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Database } from "lucide-react"
import type { ReportType } from "./ReportTypeSelect"

type Values = Record<string, number | null>

type Props = {
  reportType: ReportType
  values: Values
  onChange: (id: string, val: number | null) => void
  readOnly?: boolean
}

export default function DataEntryForm({ reportType, values, onChange, readOnly = false }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Data Entry Form
        </CardTitle>
        <CardDescription>Enter values for {reportType.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reportType.data_elements?.map((de) => (
            <div key={de.id} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <label className="text-sm font-medium line-clamp-2">{de.name}</label>
                  <div className="text-xs text-muted-foreground break-all">Code: {de.code}</div>
                </div>
                <div className="w-32 shrink-0">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    readOnly={readOnly}
                    className={readOnly ? "text-right bg-gray-50 cursor-not-allowed opacity-60" : "text-right"}
                    value={values[String(de.id)] ?? ""}
                    onChange={(e) => {
                      if (readOnly) {
                        e.preventDefault()
                        return
                      }
                      const v = e.target.value
                      if (v !== "" && !/^-?\d*\.?\d*$/.test(v)) return
                      onChange(String(de.id), v.trim() === "" || v.trim() === "-" ? null : Number(v))
                    }}
                    disabled={readOnly}
                  />
                </div>
              </div>
              {de.category?.name && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                  Category: {de.category.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
