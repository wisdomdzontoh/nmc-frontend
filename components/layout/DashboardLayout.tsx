"use client";

import * as React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Sidebar width values must stay in sync with Sidebar.tsx (w-60 / w-16)
  const sidebarWidth = sidebarOpen ? 240 : 64; // px

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Fixed header ────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      </div>

      {/* ── Fixed sidebar ───────────────────────────────────────── */}
      {/*
        We push the sidebar down by the header height (h-16 = 64px + 4px accent bar = 68px).
        The sidebar takes up the remaining viewport height below the header.
      */}
      <div
        className="fixed left-0 bottom-0 z-40 overflow-hidden"
        style={{ top: "68px" }}
      >
        <Sidebar open={sidebarOpen} />
      </div>

      {/* ── Main content area ───────────────────────────────────── */}
      {/*
        Offset the content by:
          - top: header height (68px)
          - left: sidebar width (dynamic)
        This keeps the header + sidebar visible while content scrolls.
      */}
      <main
        className="transition-all duration-200 ease-in-out min-h-screen"
        style={{ paddingTop: "68px", paddingLeft: `${sidebarWidth}px` }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-5 min-h-[calc(100vh-68px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
