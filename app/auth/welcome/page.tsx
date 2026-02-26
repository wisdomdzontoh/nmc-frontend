"use client";

import { useEffect } from "react";

export default function WelcomePage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.replace("/dashboard");
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting…</p>
    </div>
  );
}

