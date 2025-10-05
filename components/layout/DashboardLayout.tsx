"use client";

import * as React from "react";
import Header from "./Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1">
        <div className="px-4 sm:px-6 lg:px-8 py-4">{children}</div>
      </main>
    </div>
  );
}
