// app/design-reports/page.tsx
"use client"
import Link from "next/link"
import useSWR from "swr"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function DesignReportsList() {
  const { data } = useSWR("/reporting/report-layouts/", (url) => api.get(url).then((r) => r.data))
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Report layouts</h2>
        <Link href="/design-reports/new">
          <Button>Create layout</Button>
        </Link>
      </div>
      <div className="border rounded divide-y">
        {(data || []).map((l: { id: number; name: string; code: string; status?: string; version?: number }) => (
          <Link
            key={l.id}
            href={`/design-reports/${l.id}`}
            className="flex items-center justify-between px-3 py-2 hover:bg-muted"
          >
            <div>
              <div className="font-medium">
                {l.name} <span className="text-xs text-muted-foreground">({l.code})</span>
              </div>
              <div className="text-xs text-muted-foreground">
                status: {l.status} • v{l.version}
              </div>
            </div>
            <div className="text-sm text-primary">Edit</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
