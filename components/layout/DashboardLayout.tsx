/**
 * Modern Dashboard Layout Component
 * Clean, responsive layout with sidebar navigation
 */

"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Database, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Bell,
  Mail,
  ChevronDown,
  RefreshCw,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and analytics"
  },
  {
    name: "Data Entry",
    href: "/data-entry",
    icon: FileText,
    description: "Enter report data"
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    description: "View submitted reports"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Data analytics"
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
    description: "User management"
  },
  {
    name: "Organizations",
    href: "/organizations",
    icon: Building2,
    description: "Organization units"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System settings"
  }
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { djangoUser, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo and close button */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NMC</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">NMC System</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>

        {/* User profile */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={djangoUser?.full_name} />
                      <AvatarFallback>
                        {djangoUser?.full_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {djangoUser?.full_name || "User"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {djangoUser?.email}
                      </div>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div> {/* End sidebar */}
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar - DHIMS 2 Style */}
        <header className="bg-blue-900 text-white flex-shrink-0">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-blue-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3 ml-2 lg:ml-0">
              <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-blue-900 font-bold text-sm">NMC</span>
              </div>
              <h1 className="text-xl font-semibold">
                NMC - Data Entry System
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Online</span>
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-800">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-800">
              <Mail className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-800">
              <Settings className="h-5 w-5" />
            </Button>
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
              {djangoUser?.full_name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
        
        {/* Secondary navigation bar */}
        <div className="bg-blue-800 h-12 flex items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Data Entry</span>
              <ChevronDown className="h-4 w-4" />
            </div>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
              File
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
              Options
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
