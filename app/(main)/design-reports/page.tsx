// app/design-reports/page.tsx
"use client"
import Link from "next/link"
import useSWR from "swr"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function DesignReportsList() {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }
  const { data, error, isLoading } = useSWR("/reporting/report-layouts/", (url) => api.get(url).then((r) => r.data))

  // Check if user is staff or superuser
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading report layouts...</p>
      </div>
    )
  }

  // Show error if user doesn't have permission
  if (error?.response?.status === 403) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Report Designer</h1>
        <Alert>
          <AlertDescription>
            You do not have permission to view or manage report layouts. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Show error if user is not staff or superuser
  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Report Designer</h1>
        <Alert>
          <AlertDescription>
            Report design is only available to staff and administrators. Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

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
