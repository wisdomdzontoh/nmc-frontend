/**
 * Users Management Page
 * - Refetch list after create (so the new user appears with normalized fields)
 * - Data table using shadcn Table + TanStack React-Table
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
// import { createClient } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import {
  Plus,
  Search,
  Loader2,
  Building2,
  Mail,
  Calendar,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

import OrgUnitSelectionModal from "@/components/modals/OrgUnitSelectionModal"

// TanStack Table
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Column,
} from "@tanstack/react-table"

interface OrgTreeNode {
  id: number
  name: string
  type?: string
  children?: OrgTreeNode[]
}

interface UserRow {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  org_unit: number | null
  org_unit_name: string | null
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  date_joined: string
  last_login: string | null
}

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// )

/* ----------------------------- helpers ----------------------------- */

function collectAllIds(nodes: OrgTreeNode[]): number[] {
  let ids: number[] = []
  for (const n of nodes) {
    ids.push(n.id)
    if (n.children) ids = ids.concat(collectAllIds(n.children))
  }
  return ids
}

// REPLACE your getDescendantOrgIds with this exact version
function getDescendantOrgIds(tree: OrgTreeNode[], rootId: number): number[] {
  // find the node first, then collect ids only from that subtree
  const findNode = (nodes: OrgTreeNode[], id: number): OrgTreeNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const hit = findNode(n.children, id)
        if (hit) return hit
      }
    }
    return null
  }

  const collect = (node: OrgTreeNode | null): number[] => {
    if (!node) return []
    let ids = [node.id]
    if (node.children) {
      for (const c of node.children) ids = ids.concat(collect(c))
    }
    return ids
  }

  return collect(findNode(tree, rootId))
}

/* --------------------------- data table UI -------------------------- */

function RoleBadges({ user }: { user: UserRow }) {
  if (user.is_superuser) return <Badge variant="destructive">Superuser</Badge>
  if (user.is_staff) return <Badge>Staff</Badge>
  return <Badge variant="secondary">User</Badge>
}

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "full_name",
    header: ({ column }) => (
      <HeaderCell column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <UserIcon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="font-medium">{row.original.full_name || `${row.original.first_name} ${row.original.last_name}`}</div>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => <HeaderCell column={column} title="Email" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Mail className="h-4 w-4 text-gray-500" />
        {row.original.email}
      </div>
    ),
  },
  {
    accessorKey: "org_unit_name",
    header: ({ column }) => <HeaderCell column={column} title="Organization Unit" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Building2 className="h-4 w-4 text-gray-500" />
        {row.original.org_unit_name || "—"}
      </div>
    ),
  },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) => <RoleBadges user={row.original} />,
    sortingFn: (a, b) => {
      const va = a.original.is_superuser ? 2 : a.original.is_staff ? 1 : 0
      const vb = b.original.is_superuser ? 2 : b.original.is_staff ? 1 : 0
      return va - vb
    },
  },
  {
    accessorKey: "is_active",
    header: ({ column }) => <HeaderCell column={column} title="Status" />,
    cell: ({ row }) =>
      row.original.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    sortingFn: "basic",
  },
  {
    accessorKey: "date_joined",
    header: ({ column }) => <HeaderCell column={column} title="Joined" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <Calendar className="h-4 w-4 text-gray-500" />
        {new Date(row.original.date_joined).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => <HeaderCell column={column} title="Last login" />,
    cell: ({ row }) => (
      <div className="text-sm text-gray-700">
        {row.original.last_login ? new Date(row.original.last_login).toLocaleDateString() : "—"}
      </div>
    ),
  },
]

function HeaderCell({ column, title }: { column: Column<UserRow, unknown>; title: string }) {
  const isSorted = column.getIsSorted()
  return (
    <button
      className="flex items-center gap-1 select-none"
      onClick={() => column.toggleSorting(isSorted === "asc")}
    >
      <span className="text-xs uppercase tracking-wide text-gray-600">{title}</span>
      {isSorted === "asc" && <ChevronUp className="h-3.5 w-3.5 text-gray-500" />}
      {isSorted === "desc" && <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
    </button>
  )
}

function UsersDataTable({ data, search, onSearch }: {
  data: UserRow[]
  search: string
  onSearch: (v: string) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "full_name", desc: false }])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Users</CardTitle>
        <CardDescription>Search, sort and explore users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users by name, email, or username…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TableCaption className="pt-4">Showing {table.getRowModel().rows.length} user(s)</TableCaption>
      </CardContent>
    </Card>
  )
}

/* ------------------------------ main page ------------------------------ */

const UsersPage: React.FC = () => {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }

  const [users, setUsers] = useState<UserRow[]>([])
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // create dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createData, setCreateData] = useState<{
    email: string
    username: string
    first_name: string
    last_name: string
    org_unit: number | null
    org_unit_name?: string | null
    is_staff: boolean
  }>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    org_unit: null,
    org_unit_name: null,
    is_staff: false,
  })

  // org-unit modal
  const [orgModalOpen, setOrgModalOpen] = useState(false)

  // initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [usersRes, orgTreeRes] = await Promise.all([
          ApiClient.getUsers(),
          ApiClient.getOrgUnits(),
        ])
        setUsers(usersRes.data.results || usersRes.data)
        setOrgTree(orgTreeRes.data || [])
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined
        if (status === 403) {
          setError("You do not have permission to view or manage users. Contact your administrator if you need access.")
          setUsers([])
          setOrgTree([])
        } else {
          setError("Failed to load users or org units.")
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)
  const myOrgId = djangoUser?.org_unit ?? null
  
  // If superuser OR staff without an assigned org → see everyone.
  // Else if staff with an org → see that org + descendants.
  // Else (no staff) → see only yourself.
  const scopeAll = Boolean(isSuperuser || (isStaff && !myOrgId))
  
  const allowedOrgIds = useMemo(() => {
    if (scopeAll) return collectAllIds(orgTree)             // whole tree
    if (myOrgId) return getDescendantOrgIds(orgTree, myOrgId) // my subtree
    return []                                               // no org assigned and not superuser
  }, [orgTree, scopeAll, myOrgId])
  
  const visibleUsers = useMemo(() => {
    const q = searchTerm.toLowerCase()
  
    const inScope = (u: UserRow) => {
      if (scopeAll) return true
      if (!isStaff) return u.id === (djangoUser as unknown as { id?: number })?.id // non-staff: only self
      // staff w/ org: users whose org is inside my subtree
      return u.org_unit != null && allowedOrgIds.includes(u.org_unit)
    }
  
    return (users || [])
      .filter(inScope)
      .filter((u) =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q)
      )
  }, [users, searchTerm, scopeAll, isStaff, djangoUser, allowedOrgIds])
  

  const canManageUsers = isSuperuser || Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  async function refetchUsers() {
    const res = await ApiClient.getUsers()
    setUsers(res.data.results || res.data)
  }

// create user and refresh list to ensure normalized fields are present
async function handleCreate() {
  if (!createData.email.trim() || !createData.org_unit) {
    setError("Email and organization unit are required")
    return
  }

  try {
    setIsSubmitting(true)
    setError(null)

    // 1) Create user in Django
    await ApiClient.createUser(createData)

    // 2) Refresh list so the new user shows up with server-computed fields
    await refetchUsers()

    // 3) Fire the Supabase invite via server route (service role) — non-blocking for UX
    try {
      await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createData.email,
          // redirectTo is optional; add if you have a callback route:
          // redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        }),
      })
      // You can check response.ok and show a toast if desired.
    } catch (inviteErr) {
      // Don't fail the whole flow if email sending has an issue.
      console.error("Invite failed:", inviteErr)
    }

    // 4) Reset form & close dialog
    setIsCreateDialogOpen(false)
    setCreateData({
      email: "",
      username: "",
      first_name: "",
      last_name: "",
      org_unit: null,
      org_unit_name: null,
      is_staff: false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ""
    setError("Failed to create user. " + message)
  } finally {
    setIsSubmitting(false)
  }
}


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    )
  }

  if (error === "You do not have permission to view or manage users. Contact your administrator if you need access.") {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600 mb-4">{error}</p>
      </div>
    )
  }

  if (!isSuperuser && !djangoUser?.org_unit) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">User Management</h1>
        <p className="text-gray-600 mb-4">You are not assigned to any organization unit. User management is disabled.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users within your organization hierarchy</p>
        </div>
        {canManageUsers && (
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={allowedOrgIds.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Add User
          </Button>
        )}
      </div>

      {/* Users table */}
      <UsersDataTable data={visibleUsers} search={searchTerm} onSearch={setSearchTerm} />

      {/* CREATE USER DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent
          className="z-[50] p-0 sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          <div className="border-b bg-white">
            <DialogHeader className="p-4">
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to your organization. They’ll receive a verification email.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-auto">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={createData.email}
                onChange={(e) => setCreateData((p) => ({ ...p, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                value={createData.username}
                onChange={(e) => setCreateData((p) => ({ ...p, username: e.target.value }))}
                placeholder="Enter username (optional)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={createData.first_name}
                  onChange={(e) => setCreateData((p) => ({ ...p, first_name: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={createData.last_name}
                  onChange={(e) => setCreateData((p) => ({ ...p, last_name: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            {/* Org Unit (page-level modal trigger) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Unit *</label>
              <div className="flex items-center justify-between rounded border p-3 bg-gray-50">
                <div className="text-sm text-gray-700">
                  {createData.org_unit
                    ? createData.org_unit_name || `Unit ID #${createData.org_unit}`
                    : "No organisation selected"}
                </div>
                <Button variant="outline" size="sm" onClick={() => setOrgModalOpen(true)}>
                  Choose organisation unit
                </Button>
              </div>
            </div>

            {/* Staff Role (only show to staff/superusers) */}
            {canManageUsers && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_staff"
                  checked={createData.is_staff}
                  onCheckedChange={(checked) =>
                    setCreateData((p) => ({ ...p, is_staff: !!checked }))
                  }
                />
                <label
                  htmlFor="is_staff"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Grant staff access
                </label>
              </div>
            )}
          </div>

          <div className="border-t bg-white">
            <DialogFooter className="p-3 sm:p-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting || !createData.org_unit}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ORG UNIT SELECTION MODAL */}
      <OrgUnitSelectionModal
        isOpen={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        userOrgUnit={djangoUser?.org_unit || undefined}
        onSelect={(units) => {
          const picked = units[0]
          setCreateData((prev) => ({
            ...prev,
            org_unit: picked ? picked.id : null,
            org_unit_name: picked ? picked.name : null,
          }))
          setOrgModalOpen(false)
        }}
      />
    </div>
  )
}

export default UsersPage
