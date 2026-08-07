"use client";

import { ReactNode, useEffect } from "react";

import { X } from "lucide-react";

import { Typography } from "@/components";

interface ModalProps {
  open: boolean;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
  onClose: () => void;
  children: ReactNode;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  title,
  size = "md",
  onClose,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--primary)]/50"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={`
          relative
          w-full
          ${sizeClasses[size]}
          rounded-2xl
          border
          border-[var(--border)]
          bg-[var(--surface)]
          shadow-xl
        `}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <Typography id="modal-title" variant="title">
            {title}
          </Typography>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-[var(--surface-hover)]"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
