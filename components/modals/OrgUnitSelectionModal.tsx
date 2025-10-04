/**
 * Organization Unit Selection Modal - DHIMS 2 Style
 * Allows users to select their assigned org unit and its children
 */

"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  Search,
  Loader2
} from "lucide-react"
import api from "@/lib/api"

interface OrgUnit {
  id: number
  name: string
  description?: string
  parent?: number
  level: number
  is_active: boolean
  children?: OrgUnit[]
}

interface OrgUnitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedUnits: OrgUnit[]) => void
  userOrgUnit?: number
}

const OrgUnitSelectionModal: React.FC<OrgUnitSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  userOrgUnit
}) => {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [filteredUnits, setFilteredUnits] = useState<OrgUnit[]>([])
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set())
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [userSubUnits, setUserSubUnits] = useState(false)
  const [userSubX2Units, setUserSubX2Units] = useState(false)

  // Load organization units
  useEffect(() => {
    if (isOpen) {
      loadOrgUnits()
    }
  }, [isOpen])

  // Filter units based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = orgUnits.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUnits(filtered)
    } else {
      setFilteredUnits(orgUnits)
    }
  }, [searchTerm, orgUnits])

  const loadOrgUnits = async () => {
    try {
      setLoading(true)
      const response = await api.get("/org/tree/")
      setOrgUnits(response.data)
      setFilteredUnits(response.data)
      
      // Auto-expand user's org unit and its children
      if (userOrgUnit) {
        setExpandedUnits(prev => new Set([...prev, userOrgUnit]))
        setSelectedUnits(prev => new Set([...prev, userOrgUnit]))
      }
    } catch (error) {
      console.error("Failed to load organization units:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (unitId: number) => {
    setExpandedUnits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(unitId)) {
        newSet.delete(unitId)
      } else {
        newSet.add(unitId)
      }
      return newSet
    })
  }

  const toggleSelection = (unitId: number) => {
    setSelectedUnits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(unitId)) {
        newSet.delete(unitId)
      } else {
        newSet.add(unitId)
      }
      return newSet
    })
  }

  const handleUserSubUnitsChange = (checked: boolean) => {
    setUserSubUnits(checked)
    if (checked && userOrgUnit) {
      // Auto-select user's org unit and its direct children
      const userUnit = orgUnits.find(unit => unit.id === userOrgUnit)
      if (userUnit) {
        setSelectedUnits(prev => {
          const newSet = new Set(prev)
          newSet.add(userOrgUnit)
          // Add direct children
          userUnit.children?.forEach(child => {
            newSet.add(child.id)
          })
          return newSet
        })
      }
    }
  }

  const handleUserSubX2UnitsChange = (checked: boolean) => {
    setUserSubX2Units(checked)
    if (checked && userOrgUnit) {
      // Auto-select user's org unit and its children up to 2 levels
      const userUnit = orgUnits.find(unit => unit.id === userOrgUnit)
      if (userUnit) {
        setSelectedUnits(prev => {
          const newSet = new Set(prev)
          newSet.add(userOrgUnit)
          
          const addChildren = (unit: OrgUnit, level: number = 0) => {
            if (level < 2) {
              unit.children?.forEach(child => {
                newSet.add(child.id)
                addChildren(child, level + 1)
              })
            }
          }
          
          addChildren(userUnit)
          return newSet
        })
      }
    }
  }

  const handleUpdate = () => {
    const selected = orgUnits.filter(unit => selectedUnits.has(unit.id))
    onSelect(selected)
    onClose()
  }

  const renderOrgUnitTree = (units: OrgUnit[], level: number = 0) => {
    return units.map((unit) => (
      <div key={unit.id} className="select-none">
        <div 
          className="flex items-center py-2 px-2 hover:bg-gray-50 rounded"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {unit.children && unit.children.length > 0 && (
            <button
              onClick={() => toggleExpanded(unit.id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {expandedUnits.has(unit.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          
          {(!unit.children || unit.children.length === 0) && (
            <div className="w-6 mr-2" />
          )}
          
          <Checkbox
            checked={selectedUnits.has(unit.id)}
            onCheckedChange={() => toggleSelection(unit.id)}
            className="mr-3"
          />
          
          <Building2 className="h-4 w-4 mr-2 text-gray-500" />
          <span className="text-sm">{unit.name}</span>
        </div>
        
        {expandedUnits.has(unit.id) && unit.children && (
          <div>
            {renderOrgUnitTree(unit.children, level + 1)}
          </div>
        )}
      </div>
    ))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Organisation unit
          </DialogTitle>
          <DialogDescription>
            Select the organization units for data entry
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Selection Options */}
          <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="user-org-unit"
                checked={selectedUnits.has(userOrgUnit || 0)}
                onCheckedChange={(checked) => {
                  if (checked && userOrgUnit) {
                    setSelectedUnits(prev => new Set([...prev, userOrgUnit]))
                  } else if (userOrgUnit) {
                    setSelectedUnits(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(userOrgUnit)
                      return newSet
                    })
                  }
                }}
              />
              <label htmlFor="user-org-unit" className="text-sm font-medium">
                User organisation unit
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="user-sub-units"
                checked={userSubUnits}
                onCheckedChange={handleUserSubUnitsChange}
              />
              <label htmlFor="user-sub-units" className="text-sm font-medium">
                User sub-units
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="user-sub-x2-units"
                checked={userSubX2Units}
                onCheckedChange={handleUserSubX2UnitsChange}
              />
              <label htmlFor="user-sub-x2-units" className="text-sm font-medium">
                User sub-x2-units
              </label>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Filter organisation units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Organization Units Tree */}
          <div className="border rounded-lg overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading organization units...</span>
              </div>
            ) : (
              <div className="p-2">
                {renderOrgUnitTree(filteredUnits)}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hide
          </Button>
          <Button onClick={handleUpdate}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrgUnitSelectionModal
