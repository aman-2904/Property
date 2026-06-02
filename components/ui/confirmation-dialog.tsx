"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalOverlay,
  ModalPortal,
} from "./modal-system";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  isLoading = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const variantColors = {
    danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    warning: "bg-amber-500 text-black hover:bg-amber-600",
    info: "bg-primary text-primary-foreground hover:bg-primary/90",
  };

  return (
    <Modal open={isOpen} onOpenChange={onOpenChange}>
      <ModalPortal>
        <ModalOverlay />
        <ModalContent isOpen={isOpen} className="max-w-md border border-border/50">
          <ModalHeader className="flex flex-row items-start gap-4 space-y-0">
            {variant === "danger" && (
              <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}
            {variant === "warning" && (
              <div className="rounded-full bg-amber-500/10 p-3 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1">
              <ModalTitle>{title}</ModalTitle>
              <ModalDescription className="mt-2 text-sm">
                {description}
              </ModalDescription>
            </div>
          </ModalHeader>
          <ModalFooter className="mt-6 flex gap-2">
            <button
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-input bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              disabled={isLoading}
              onClick={handleConfirm}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium shadow transition-colors disabled:opacity-50",
                variantColors[variant]
              )}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                confirmText
              )}
            </button>
          </ModalFooter>
        </ModalContent>
      </ModalPortal>
    </Modal>
  );
}
