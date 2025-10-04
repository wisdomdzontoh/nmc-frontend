/**
 * Organizations Management Page
 * Complete organization unit management interface
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
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  MapPin,
  Loader2
} from "lucide-react"

interface OrgUnit {
  id: number
  name: string
  description?: string
  parent?: number
  parent_name?: string
  level: number
  is_active: boolean
  created_at: string
  updated_at: string
  user_count?: number
}

interface CreateOrgUnitData {
  name: string
  description: string
  parent?: number
}

const OrganizationsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createData, setCreateData] = useState<CreateOrgUnitData>({
    name: "",
    description: "",
    parent: undefined
  })

  // Load organization units
  useEffect(() => {
    const loadOrgUnits = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await ApiClient.getOrgUnits()
        setOrgUnits(response.data)
      } catch (err: any) {
        console.error("Failed to load organization units:", err)
        setError("Failed to load organization units. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadOrgUnits()
  }, [])

  // Handle create organization unit
  const handleCreate = async () => {
    if (!createData.name.trim()) {
      setError("Organization name is required")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      const response = await ApiClient.createOrgUnit(createData)
      setOrgUnits(prev => [...prev, response.data])
      setIsCreateDialogOpen(false)
      setCreateData({ name: "", description: "", parent: undefined })
    } catch (err: any) {
      console.error("Failed to create organization unit:", err)
      setError("Failed to create organization unit. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter organization units based on search term
  const filteredOrgUnits = orgUnits.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group organization units by level for better display
  const groupedOrgUnits = filteredOrgUnits.reduce((acc, unit) => {
    if (!acc[unit.level]) {
      acc[unit.level] = []
    }
    acc[unit.level].push(unit)
    return acc
  }, {} as Record<number, OrgUnit[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization units...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage organizational units and hierarchy
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Organization Unit</DialogTitle>
              <DialogDescription>
                Add a new organizational unit to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={createData.name}
                  onChange={(e) => setCreateData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={createData.description}
                  onChange={(e) => setCreateData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Parent Organization</label>
                <Select
                  value={createData.parent?.toString() || ""}
                  onValueChange={(value) => setCreateData(prev => ({ 
                    ...prev, 
                    parent: value ? parseInt(value) : undefined 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No parent (Root level)</SelectItem>
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
                  "Create"
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
          <CardTitle>Search Organizations</CardTitle>
          <CardDescription>
            Find organization units by name or description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization Units */}
      <div className="space-y-6">
        {Object.keys(groupedOrgUnits).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No organization units found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first organization unit."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization Unit
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedOrgUnits)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, units]) => (
              <div key={level} className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Level {level} Organizations
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => (
                    <Card key={unit.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">{unit.name}</CardTitle>
                          </div>
                          <Badge variant={unit.is_active ? "default" : "secondary"}>
                            {unit.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {unit.parent_name && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            Parent: {unit.parent_name}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {unit.description && (
                          <p className="text-sm text-gray-600 mb-4">
                            {unit.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            {unit.user_count || 0} users
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

export default OrganizationsPage
