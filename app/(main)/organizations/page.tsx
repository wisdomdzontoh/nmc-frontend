/**
 * Organizations Management Page
 * Complete organization unit management interface
 */

"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Building2, ChevronDown, ChevronRight, Loader2 } from "lucide-react"

interface OrgUnit {
  id: number
  name: string
  type?: string
  children?: OrgUnit[]
}

const OrganizationsPage: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { djangoUser } = useAuth()
  const [orgTree, setOrgTree] = useState<OrgUnit[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true)
      try {
        const response = await ApiClient.getOrgUnits()
        // Optionally, filter to only the user's assigned org(s) if needed
        setOrgTree(response.data)
      } catch {
        setOrgTree([])
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [])

  const toggle = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const renderTree = (nodes: OrgUnit[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.id}>
        <div
          className="flex items-center py-1.5 pr-2"
          style={{ paddingLeft: 10 + level * 18 }}
        >
          {node.children && node.children.length > 0 ? (
            <button className="mr-1 p-1" onClick={() => toggle(node.id)}>
              {expanded[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <Building2 className="h-4 w-4 mr-2 text-blue-600" />
          <span className="font-medium text-base">{node.name}</span>
          {node.type && <span className="ml-2 text-xs text-gray-500">{node.type}</span>}
        </div>
        {node.children && node.children.length > 0 && expanded[node.id] && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Organization Units</h1>
      <p className="text-muted-foreground mb-6">View your assigned organization unit and its hierarchy.</p>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-blue-600" />
          <span className="text-gray-600">Loading organization units…</span>
        </div>
      ) : orgTree && orgTree.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          {renderTree(orgTree)}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">No organization units found.</div>
      )}
    </div>
  )
}

export default OrganizationsPage
