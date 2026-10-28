"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type PickerTriggerProps = Omit<React.ComponentProps<"button">, "value"> & {
  label: string
  /** The chosen value, or null to show the placeholder. */
  chosen: React.ReactNode | null
  placeholder: string
  icon?: React.ReactNode
}

/** Field-style button that opens a picker: small label on top, chosen value (or prompt) below. */
export function PickerTrigger({ label, chosen: chosenValue, placeholder, icon, className, ...props }: PickerTriggerProps) {
  const chosen = chosenValue !== null && chosenValue !== undefined && chosenValue !== ""
  return (
    <button
      type="button"
      className={cn(
        "group flex h-14 w-full min-w-0 items-center gap-3 rounded-lg border bg-card px-3 text-left transition-colors outline-none hover:border-foreground/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/25",
        chosen ? "border-input" : "border-dashed border-input",
        className
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            chosen ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className={cn("block truncate text-sm", chosen ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {chosen ? chosenValue : placeholder}
        </span>
      </span>
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </button>
  )
}
