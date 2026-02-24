"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BarChart, FileText, Database, Users, Settings, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Data Entry", href: "/data-entry", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart, admin: true },
  { name: "Analytics", href: "/analytics", icon: BarChart, admin: true },
  { name: "Visualizations", href: "/visualizations", icon: BarChart, admin: true },
  { name: "Indicators", href: "/indicators", icon: TrendingUp, admin: true },
  { name: "Metadata", href: "/metadata", icon: Database, admin: true },
  { name: "Users", href: "/users", icon: Users, admin: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { djangoUser } = useAuth(); // Get the Django user from context

  return (
    <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow bg-slate-900 pt-5 overflow-y-auto border-r border-slate-800">
        <div className="flex items-center flex-shrink-0 px-4 mb-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
              <Image
                src="/logo.png"
                alt="NMC Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-slate-50 text-lg font-semibold tracking-tight">
              NMC DMS
            </span>
          </Link>
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
                    "text-slate-200 hover:bg-slate-800 hover:text-white",
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    pathname === item.href ? "bg-slate-800 text-white border border-slate-700" : ""
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 flex-shrink-0 h-6 w-6",
                      pathname === item.href ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
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
