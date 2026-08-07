import { cva } from "class-variance-authority";

export const inputVariants = cva([
  "w-full",
  "rounded-2xl",
  "border",
  "border-[var(--border)]",
  "bg-[var(--surface)]",
  "px-4",
  "py-3",
  "text-sm",
  "text-[var(--text-primary)]",
  "outline-none",
  "transition-all",
  "placeholder:text-[var(--text-muted)]",
  "focus:border-[var(--primary)]",
  "disabled:cursor-not-allowed",
  "disabled:bg-[var(--surface-active)]",
  "disabled:text-[var(--text-muted)]",
]);
