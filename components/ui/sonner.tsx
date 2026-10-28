"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Themed Toaster — mounted once in app/layout.tsx; never mount again inside pages.
 * Success toasts close on their own; errors stay until closed (closeButton).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm rounded-xl border shadow-md",
          title: "font-semibold text-[0.8125rem]",
          description: "text-xs opacity-90 mt-0.5",
          closeButton: "opacity-60 hover:opacity-100",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(var(--popover))",
          "--normal-text": "hsl(var(--popover-foreground))",
          "--normal-border": "hsl(var(--border))",
          "--success-bg": "hsl(var(--success-bg))",
          "--success-text": "hsl(var(--success))",
          "--success-border": "hsl(var(--success-border))",
          "--error-bg": "hsl(var(--error-bg))",
          "--error-text": "hsl(var(--error))",
          "--error-border": "hsl(var(--error-border))",
          "--warning-bg": "hsl(var(--warning-bg))",
          "--warning-text": "hsl(var(--warning))",
          "--warning-border": "hsl(var(--warning-border))",
          "--info-bg": "hsl(var(--info-bg))",
          "--info-text": "hsl(var(--info))",
          "--info-border": "hsl(var(--info-border))",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
