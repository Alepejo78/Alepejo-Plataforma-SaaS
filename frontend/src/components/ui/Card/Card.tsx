import { HTMLAttributes } from "react";

import { cn } from "@/lib";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "border",
        "border-[var(--border)]",
        "bg-[var(--surface)]",
        "text-[var(--text-primary)]",
        "shadow-sm",
        "transition-all",
        className
      )}
      {...props}
    />
  );
}
