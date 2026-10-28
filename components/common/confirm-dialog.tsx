"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name the exact thing: "Delete the 'Monthly returns' report?" */
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  /** Say exactly what happens: "Yes, delete report". Never "Confirm" or "OK". */
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}

/** Confirmation for risky actions (delete, remove access, discard). Stays open if the action throws. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Go back",
  confirmLabel,
  destructive,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  async function handleConfirm() {
    try {
      await Promise.resolve(onConfirm());
      onOpenChange(false);
    } catch {
      /* caller shows the error — keep the dialog open */
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-left">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {pending ? "Please wait…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
