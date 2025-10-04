/**
 * Users Management Page
 * Complete user management interface for administrators
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Mail,
  Building2,
  Calendar,
  Shield,
  Loader2,
  MoreHorizontal
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

interface User {
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

interface CreateUserData {
  email: string
  username: string
  first_name: string
  last_name: string
  org_unit: number | null
  password?: string
}

interface OrgUnit {
  id: number
  name: string
  description?: string
}

const UsersPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Create User Dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createData, setCreateData] = useState<CreateUserData>({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    org_unit: null
  })

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [usersRes, orgUnitsRes] = await Promise.all([
          ApiClient.getUsers(),
          ApiClient.getOrgUnits()
        ])
        setUsers(usersRes.data.results || usersRes.data)
        setOrgUnits(orgUnitsRes.data)
      } catch (err: any) {
        console.error("Failed to load users data:", err)
        setError("Failed to load users data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Handle create user
  const handleCreate = async () => {
    if (!createData.email.trim()) {
      setError("Email is required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      const response = await ApiClient.createUser(createData)
      setUsers(prev => [response.data, ...prev])
      setIsCreateDialogOpen(false)
      setCreateData({ email: "", username: "", first_name: "", last_name: "", org_unit: null })
    } catch (err: any) {
      console.error("Failed to create user:", err)
      setError("Failed to create user. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === "all" || 
      (roleFilter === "admin" && user.is_staff) ||
      (roleFilter === "superuser" && user.is_superuser) ||
      (roleFilter === "user" && !user.is_staff && !user.is_superuser)
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active)

    return matchesSearch && matchesRole && matchesStatus
  })

  // Get role badge variant
  const getRoleBadgeVariant = (user: User) => {
    if (user.is_superuser) return "destructive"
    if (user.is_staff) return "default"
    return "secondary"
  }

  // Get role text
  const getRoleText = (user: User) => {
    if (user.is_superuser) return "Superuser"
    if (user.is_staff) return "Staff"
    return "User"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and their permissions
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
        <Button>
              <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. They will receive login credentials.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={createData.username}
                  onChange={(e) => setCreateData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={createData.first_name}
                    onChange={(e) => setCreateData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={createData.last_name}
                    onChange={(e) => setCreateData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Organization Unit</label>
                <Select
                  value={createData.org_unit?.toString() || ""}
                  onValueChange={(value) => setCreateData(prev => ({ 
                    ...prev, 
                    org_unit: value ? parseInt(value) : null 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No organization unit</SelectItem>
                    {orgUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id.toString()}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter Users</CardTitle>
          <CardDescription>
            Find users by name, email, or role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="superuser">Superuser</SelectItem>
                <SelectItem value="admin">Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setRoleFilter("all")
              setStatusFilter("all")
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No users found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all" 
                  ? "Try adjusting your search or filter criteria." 
                  : "Get started by adding your first user."}
              </p>
              {!searchTerm && roleFilter === "all" && statusFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{user.full_name}</h3>
                        <Badge variant={getRoleBadgeVariant(user)}>
                          {getRoleText(user)}
                        </Badge>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {user.email}
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2" />
                          {user.org_unit_name || "No organization"}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Joined {new Date(user.date_joined).toLocaleDateString()}
                        </div>
                      </div>
                      {user.last_login && (
                        <div className="text-sm text-gray-500 mt-2">
                          Last login: {new Date(user.last_login).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Shield className="mr-2 h-4 w-4" />
                          Manage Permissions
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default UsersPage