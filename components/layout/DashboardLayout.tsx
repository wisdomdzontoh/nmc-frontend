"use client";

import * as React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Restore persisted sidebar state on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("nmc_sidebar_open");
      if (stored !== null) {
        setSidebarOpen(stored === "true");
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("nmc_sidebar_open", String(next));
        }
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Sidebar width values must stay in sync with Sidebar.tsx (w-60 / w-16)
  const sidebarWidth = sidebarOpen ? 240 : 64; // px

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Fixed header ────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header sidebarOpen={sidebarOpen} onToggleSidebar={handleToggleSidebar} />
      </div>

      {/* ── Fixed sidebar ───────────────────────────────────────── */}
      {/*
        We push the sidebar down by the header height (2px accent + 68px row = 70px).
        The sidebar takes up the remaining viewport height below the header.
      */}
      <div
        className="fixed left-0 bottom-0 z-40 overflow-hidden"
        style={{ top: "70px" }}
      >
        <Sidebar open={sidebarOpen} />
      </div>

      {/* ── Main content area ───────────────────────────────────── */}
      {/*
        Offset the content by:
          - top: header height (70px)
          - left: sidebar width (dynamic)
        This keeps the header + sidebar visible while content scrolls.
      */}
      <main
        className="transition-all duration-200 ease-in-out min-h-screen"
        style={{ paddingTop: "70px", paddingLeft: `${sidebarWidth}px` }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-5 min-h-[calc(100vh-70px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
