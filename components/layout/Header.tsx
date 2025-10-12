"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Database,
  Users,
  Settings,
  Grid,
  Bell,
  Mail,
  Circle,
  Search,
  LogOut,
  ChevronRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type AppItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "Top apps" | "All apps";
  description?: string;
  badge?: string;
};

const APPS: AppItem[] = [
  { 
    label: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard, 
    group: "Top apps",
    description: "Overview and key metrics",
  },
  { 
    label: "Data Entry", 
    href: "/data-entry", 
    icon: FileText, 
    group: "Top apps",
    description: "Submit new reports",
    badge: "New",
  },
  { 
    label: "Design Reports", 
    href: "/design-reports", 
    icon: FileText, 
    group: "Top apps",
    description: "Create report templates",
  },
  { 
    label: "Reports", 
    href: "/reports", 
    icon: FileText, 
    group: "Top apps",
    description: "View submitted reports",
  },
  { 
    label: "Analytics", 
    href: "/analytics", 
    icon: BarChart3, 
    group: "Top apps",
    description: "Data visualization and insights",
  },
  { 
    label: "Indicators", 
    href: "/indicators", 
    icon: TrendingUp, 
    group: "All apps",
    description: "Manage calculation indicators",
  },
  { 
    label: "Organizations", 
    href: "/organizations", 
    icon: Database, 
    group: "All apps",
    description: "Manage organization units",
  },
  { 
    label: "Users", 
    href: "/users", 
    icon: Users, 
    group: "All apps",
    description: "User management",
  },
  { 
    label: "Settings", 
    href: "/settings", 
    icon: Settings, 
    group: "All apps",
    description: "System configuration",
  },
];

export default function Header() {
  const { djangoUser, logout } = useAuth();
  const pathname = usePathname();

  const [appsOpen, setAppsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount] = useState(3);
  const [mailCount] = useState(5);

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return APPS;
    return APPS.filter((app) => 
      app.label.toLowerCase().includes(query) || 
      app.description?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const topApps = filteredApps.filter((app) => app.group === "Top apps").slice(0, 6);

  const getUserInitials = () => {
    if (!djangoUser?.full_name) return "U";
    const names = djangoUser.full_name.split(" ");
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return djangoUser.full_name.charAt(0).toUpperCase();
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg">
      {/* Main header row */}
      <div className="h-14 flex items-center justify-between px-4 lg:px-6">
        {/* Left: Brand and title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/dashboard" className="flex-shrink-0 group">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
              <span className="text-blue-900 font-bold text-base">NMC</span>
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight truncate">
              Nursing and Midwifery Council
            </h1>
            <p className="text-xs text-blue-200 hidden lg:block">
              Health Information Management System
            </p>
          </div>
        </div>

        {/* Right: Actions and user */}
        <div className="flex items-center gap-2">
          {/* Online status - desktop only */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />
            <span className="text-xs font-medium">Online</span>
          </div>

          <Separator orientation="vertical" className="h-6 bg-white/20 hidden lg:block" />

          {/* Messages */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white/90 hover:bg-white/10 hover:text-white transition-all"
          >
            <Mail className="h-5 w-5" />
            {mailCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 hover:bg-red-500 border-2 border-blue-900"
              >
                <span className="text-[10px]">{mailCount > 9 ? '9+' : mailCount}</span>
              </Badge>
            )}
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white/90 hover:bg-white/10 hover:text-white transition-all"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-500 hover:bg-orange-500 border-2 border-blue-900"
              >
                <span className="text-[10px]">{notificationCount > 9 ? '9+' : notificationCount}</span>
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* App Launcher */}
          <Popover open={appsOpen} onOpenChange={setAppsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/90 hover:bg-white/10 hover:text-white transition-all"
              >
                <Grid className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              align="end" 
              className="w-[700px] max-h-[90vh] overflow-hidden p-0 shadow-2xl border border-gray-200 rounded-xl"
              sideOffset={8}
            >
              {/* Search header */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search apps..."
                    className="pl-10 h-10 bg-white border-gray-200 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {/* Apps grid */}
              <div className="p-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
                {filteredApps.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No apps found matching - {searchQuery}</p>
                  </div>
                ) : (
                  <>
                    {/* Top apps section */}
                    {topApps.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Featured Apps
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {topApps.map((app) => (
                            <Link
                              key={app.href}
                              href={app.href}
                              onClick={() => {
                                setAppsOpen(false);
                                setSearchQuery("");
                              }}
                              className={`
                                group relative border rounded-lg p-4 transition-all hover:shadow-md
                                ${pathname.startsWith(app.href) 
                                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                                  : 'bg-white hover:bg-gray-50 border-gray-200'
                                }
                              `}
                            >
                              <div className={`
                                w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors
                                ${pathname.startsWith(app.href)
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700 group-hover:bg-blue-100 group-hover:text-blue-700'
                                }
                              `}>
                                <app.icon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {app.label}
                                  </span>
                                  {app.badge && (
                                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500 hover:bg-green-500">
                                      {app.badge}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {app.description}
                                </p>
                              </div>
                              {pathname.startsWith(app.href) && (
                                <div className="absolute top-2 right-2">
                                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All apps list */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Grid className="h-4 w-4 text-gray-600" />
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          All Applications
                        </h3>
                      </div>
                      <div className="border rounded-lg divide-y bg-white max-h-[320px] overflow-y-auto">
                        {filteredApps.map((app) => (
                          <Link
                            key={app.href}
                            href={app.href}
                            onClick={() => {
                              setAppsOpen(false);
                              setSearchQuery("");
                            }}
                            className={`
                              flex items-center gap-3 px-4 py-3 transition-colors group
                              ${pathname.startsWith(app.href) 
                                ? 'bg-blue-50' 
                                : 'hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className={`
                              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                              ${pathname.startsWith(app.href)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                              }
                            `}>
                              <app.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`
                                  text-sm font-medium
                                  ${pathname.startsWith(app.href) ? 'text-blue-900' : 'text-gray-900'}
                                `}>
                                  {app.label}
                                </span>
                                {app.badge && (
                                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-500 hover:bg-green-500">
                                    {app.badge}
                                  </Badge>
                                )}
                              </div>
                              {app.description && (
                                <p className="text-xs text-gray-500 truncate">
                                  {app.description}
                                </p>
                              )}
                            </div>
                            <ChevronRight className={`
                              h-4 w-4 flex-shrink-0
                              ${pathname.startsWith(app.href) ? 'text-blue-600' : 'text-gray-400'}
                            `} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <p className="text-[11px] text-gray-500 text-center">
                  Use <kbd className="px-1.5 py-0.5 rounded bg-white border text-gray-700">↑</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white border text-gray-700">↓</kbd> to navigate, 
                  <kbd className="px-1.5 py-0.5 rounded bg-white border text-gray-700 ml-1">Enter</kbd> to select, 
                  <kbd className="px-1.5 py-0.5 rounded bg-white border text-gray-700 ml-1">Esc</kbd> to close
                </p>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                <Avatar className="h-8 w-8 ring-2 ring-white/20">
                  <AvatarImage src="" alt={djangoUser?.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xs font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium leading-none">
                    {djangoUser?.full_name || "User"}
                  </p>
                  <p className="text-[10px] text-blue-200 leading-none mt-0.5">
                    {djangoUser?.org_unit_name || "No unit"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
              <DropdownMenuLabel className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={djangoUser?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {djangoUser?.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {djangoUser?.email || "No email"}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logout()}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}