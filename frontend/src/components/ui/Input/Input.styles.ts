import { cva } from "class-variance-authority";

export const inputVariants = cva(
  [
    "w-full",
    "rounded-2xl",
    "border",
    "border-zinc-300",
    "bg-white",
    "px-4",
    "py-3",
    "text-sm",
    "outline-none",
    "transition-all",
    "placeholder:text-zinc-400",
    "focus:border-zinc-900",
    "focus:ring-2",
    "focus:ring-zinc-900/10",
    "disabled:cursor-not-allowed",
    "disabled:bg-zinc-100",
  ]
);