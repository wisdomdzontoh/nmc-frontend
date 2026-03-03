"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Themed Toaster — brand-aligned toast notifications.
 * Mounted once in app/layout.tsx; never mount again inside pages.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm rounded-lg shadow-md border",
          title: "font-semibold text-[0.8125rem]",
          description: "text-xs opacity-80 mt-0.5",
          closeButton: "opacity-60 hover:opacity-100",
          success: "border-green-200",
          error: "border-red-200",
          info: "border-blue-200",
          warning: "border-amber-200",
        },
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
