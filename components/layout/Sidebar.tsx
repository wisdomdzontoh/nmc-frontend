"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BarChart, FileText, Database, Users, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Data Entry", href: "/data-entry", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart },
  { name: "Analytics", href: "/analytics", icon: BarChart },
  { name: "Metadata", href: "/metadata", icon: Database, admin: true },
  { name: "Users", href: "/users", icon: Users, admin: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { djangoUser } = useAuth(); // Get the Django user from context

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow bg-gray-800 pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <span className="text-white text-2xl font-bold">NMC DMS</span>
        </div>
        <div className="mt-5 flex-1 flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {navigation.map((item) => {
              // Conditionally render admin links
              if (item.admin && !djangoUser?.is_staff) {
                return null;
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    pathname === item.href ? "bg-gray-900 text-white" : ""
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-6 w-6",
                      pathname === item.href ? "text-gray-300" : "text-gray-400 group-hover:text-gray-300"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
