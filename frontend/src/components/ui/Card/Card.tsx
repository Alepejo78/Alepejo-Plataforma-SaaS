import { HTMLAttributes } from "react";

import { cn } from "@/lib";

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        "border",
        "border-zinc-200",
        "bg-white",
        "shadow-sm",
        "transition-all",
        className
      )}
      {...props}
    />
  );
}