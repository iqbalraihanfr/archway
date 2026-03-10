"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-3">
          <div
            className={[
              "flex h-11 w-11 items-center justify-center rounded-full",
              isDestructive
                ? "bg-destructive/12 text-destructive"
                : "bg-primary/10 text-primary",
            ].join(" ")}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
