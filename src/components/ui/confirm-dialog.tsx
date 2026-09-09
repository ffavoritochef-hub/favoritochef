"use client";

import * as React from "react";
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

type Variant = "destructive" | "default" | "warning";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
  onConfirm: () => void;
  loading?: boolean;
  dangerLabel?: string;
}

const variantStyles: Record<Variant, string> = {
  destructive:
    "bg-destructive hover:bg-destructive/90 text-white shadow-sm shadow-destructive/20",
  warning:
    "bg-warning hover:bg-warning/90 text-white shadow-sm shadow-warning/20",
  default:
    "bg-primary hover:bg-primary-dark text-white shadow-sm shadow-primary/20",
};

const variantIconClass: Record<Variant, string> = {
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  default: "bg-primary/10 text-primary border-primary/20",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Tem certeza?",
  description = "Esta ação não pode ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "destructive",
  onConfirm,
  loading = false,
  dangerLabel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md !rounded-2xl">
        <DialogHeader className="gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border ${variantIconClass[variant]}`}
            >
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-1.5 text-left">
              <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 leading-relaxed">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {dangerLabel ? (
          <div className="mt-1 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
            <p className="text-[13px] font-semibold text-destructive">
              {dangerLabel}
            </p>
          </div>
        ) : null}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm()}
            disabled={loading}
            className={`w-full sm:w-auto h-11 rounded-xl font-semibold px-5 ${variantStyles[variant]}`}
          >
            {loading ? "Processando..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
